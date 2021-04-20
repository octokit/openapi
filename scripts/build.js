const { readdirSync, writeFileSync } = require("fs");
const prettier = require("prettier");

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

  // revert breaking changes

  // "/repos/{owner}/{repo}/compare/{base}...{head}" -> "/repos/{owner}/{repo}/compare/{basehead}"
  delete schema.paths["/repos/{owner}/{repo}/compare/{basehead}"];
  schema.paths[
    "/repos/{owner}/{repo}/compare/{base}...{head}"
  ] = require("./overrides/repos-compare-commits.json");

  writeFileSync(
    `generated/${file}`,
    prettier.format(JSON.stringify(schema), { parser: "json" })
  );
  console.log(`generated/${file} written`);
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
