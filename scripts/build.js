const { createWriteStream, readdirSync, writeFileSync } = require("fs");
const { resolve } = require("path");

const prettier = require("prettier");
const execa = require("execa");
const sortKeys = require("sort-keys");

const overrides = require("./overrides");

if (!process.env.ANICCA_REPOSITORY_PATH && !process.env.GITHUB_WORKSPACE) {
  throw new Error("Please set ANICCA_REPOSITORY_PATH or GITHUB_WORKSPACE");
}

run();

async function run() {
  const schemaFileNames = readdirSync("cache");
  const changeFileNames = readdirSync("changes");

  const changes = changeFileNames.reduce((map, file) => {
    const { route, ...change } = require(`../changes/${file}`);
    if (!map[route]) map[route] = [];
    map[route].push(change);
    return map;
  }, {});

  for (const file of schemaFileNames) {
    const schema = require(`../cache/${file}`);

    // apply overrides to the unaltered schemas from GitHub
    overrides(file, schema);

    for (const [path, methods] of Object.entries(schema.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const route = `${method.toUpperCase()} ${path}`;
        operation["x-octokit"] = {};

        if (!changes[route]) continue;

        operation["x-octokit"].changes = [];
        for (const change of changes[route]) {
          operation["x-octokit"].changes.push(change);
        }
      }
    }

    // overwrite version to "0.0.0-development", will be updated
    // right before publish via semantic-release
    schema.info.version = "0.0.0-development";
    schema.info.title = "GitHub's official OpenAPI spec + Octokit extension";
    schema.info.description =
      "OpenAPI specs from https://github.com/github/rest-api-description with the 'x-octokit' extension required by the Octokit SDKs";
    schema.info.contact.url = "https://github.com/octokit/openapi";

    writeFileSync(
      `generated/${file}`,
      prettier.format(JSON.stringify(schema), { parser: "json" })
    );
    console.log(`generated/${file} written`);
  }

  // generate diff files
  for (const file of schemaFileNames) {
    if (!file.endsWith("deref.json")) continue;
    if (file.startsWith("api.github.com")) continue;

    const fromPath = `generated/${toFromFilename(file)}`;
    const toPath = `generated/${file}`;
    const diffPath = `generated/${toDiffFilename(file)}`;

    const cmd = `cargo run --bin cli diff ${resolve(fromPath)} ${resolve(
      toPath
    )} --format json`;

    console.log("$ %s", cmd);
    // generate diff files using `anicca`
    // cargo run --bin cli diff /Users/gregor/Projects/octokit/openapi/generated/api.github.com.deref.json /Users/gregor/Projects/octokit/openapi/generated/ghes-3.1.deref.json --format json > diff.json
    const command = execa.command(cmd, {
      cwd:
        // local
        process.env.ANICCA_REPOSITORY_PATH ||
        // github actions
        process.env.GITHUB_WORKSPACE + "/anicca",
    });
    command.stderr.pipe(process.stderr);
    command.stdout.pipe(createWriteStream(resolve(diffPath)));
    await command;

    console.log(`${diffPath} written`);

    const json = require(`../${diffPath}`);
    writeFileSync(
      diffPath,
      prettier.format(JSON.stringify(sortKeys(json, { deep: true })), {
        parser: "json",
      })
    );

    console.log(`${diffPath} re-formatted and keys sorted`);
  }

  let schemasCode = "";

  for (const name of schemaFileNames) {
    schemasCode += `["${name.replace(
      ".json",
      ""
    )}"]: require("./generated/${name}"),`;
  }

  writeFileSync(
    "index.js",
    prettier.format(
      `
      module.exports = {
        schemas: {
          ${schemasCode}
        }
      }
    `,
      {
        parser: "babel",
      }
    )
  );
}

function toFromFilename(filename) {
  if (filename.startsWith("github.ae")) {
    return "api.github.com.deref.json";
  }

  if (filename.startsWith("ghes-3.1")) {
    return "api.github.com.deref.json";
  }

  if (filename.startsWith("ghes-2.22")) {
    return "ghes-3.0.deref.json";
  }

  if (filename.startsWith("ghes-3.")) {
    const v3Version = parseInt(filename.substr("ghes-3.".length));
    return `ghes-3.${v3Version + 1}.deref.json`;
  }

  if (filename.startsWith("ghes-2.")) {
    const v2Version = parseInt(filename.substr("ghes-2.".length));
    return `ghes-2.${v2Version + 1}.deref.json`;
  }

  throw new Error(`Cannot calculate base version for ${filename}`);
}

function toDiffFilename(filename) {
  const fromFilename = toFromFilename(filename);
  return filename.replace(".deref.json", `.diff-to-${fromFilename}`);
}
