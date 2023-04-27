const { createWriteStream, readdirSync, writeFileSync, rmSync } = require("fs");
const { basename, resolve } = require("path");

const prettier = require("prettier");
const execa = require("execa");
const sortKeys = require("sort-keys");
const equal = require("deep-equal");
const _ = require("lodash");
const { getCurrentVersions } = require("github-enterprise-server-versions");
const mapObj = require("map-obj");

const overrides = require("./overrides");

if (!process.env.GITHUB_ACTIONS && !process.env.ANICCA_REPOSITORY_PATH) {
  throw new Error("Please set ANICCA_REPOSITORY_PATH");
}

run();

async function run() {
  const ghesVersions = await getCurrentVersions();
  const latestGhesVersion = ghesVersions.reverse()[0];

  const schemaFileNames = readdirSync("cache");
  const changeFileNames = readdirSync("changes");

  const changes = changeFileNames.reduce((map, file) => {
    const { route, ...change } = require(`../changes/${file}`);
    if (!map[route]) map[route] = [];
    map[route].push(change);
    return map;
  }, {});

  // empty generated/ folder
  console.log("Emptying generated/ folder");
  readdirSync("generated").forEach((filename) => {
    if (filename === "README.md") return;

    rmSync(`generated/${filename}`);
  });

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

    writeFileSync(`generated/${file}`, JSON.stringify(schema, null, 2));
    console.log(`generated/${file} written`);
  }

  // generate diff files
  for (const file of schemaFileNames) {
    if (!file.endsWith("deref.json")) continue;
    if (file.startsWith("api.github.com")) continue;

    const fromPath = `generated/${toFromFilename(file, latestGhesVersion)}`;
    const toPath = `generated/${file}`;
    const diffPath = `generated/${toAniccaDiffFilename(
      file,
      latestGhesVersion
    )}`;

    const cmd = `cargo run --bin cli diff ${resolve(fromPath)} ${resolve(
      toPath
    )} --format json`;

    console.log("$ %s", cmd);
    // generate diff files using `anicca`
    // cargo run --bin cli diff /Users/gregor/Projects/octokit/openapi/generated/api.github.com.deref.json /Users/gregor/Projects/octokit/openapi/generated/ghes-3.1.deref.json --format json > diff.json

    const aniccaCwd = process.env.GITHUB_ACTIONS
      ? `${process.env.GITHUB_WORKSPACE}/anicca`
      : process.env.ANICCA_REPOSITORY_PATH;

    const command = execa.command(cmd, {
      cwd: aniccaCwd,
    });
    command.stderr.pipe(process.stderr);
    command.stdout.pipe(createWriteStream(resolve(diffPath)));
    await command;

    console.log(`${diffPath} written`);

    const json = require(`../${diffPath}`);

    json.paths = {
      changed: json.paths.changed
        ? Object.fromEntries(
            Object.entries(json.paths.changed).map(
              ([path, { operations_changed }]) => {
                return [path, operations_changed];
              }
            )
          )
        : {},
      added: json.paths.added ? Object.fromEntries(json.paths.added) : {},
      removed: json.paths.removed
        ? Object.fromEntries(
            json.paths.removed.map(([path, methods]) => [
              path,
              Object.keys(methods),
            ])
          )
        : {},
    };

    const jsonWithoutNullValues = mapObj(json, removeNullValues);
    const newJson = mapObj(jsonWithoutNullValues, simplifyRemovedArrays, {
      deep: true,
    });

    if (Object.keys(newJson.paths.changed).length) {
      newJson.paths.changed = mapObj(
        newJson.paths.changed,
        removeUnchangedKeys,
        {
          deep: true,
        }
      );
    }

    const minimalJson = mapObj(newJson, removeDeepEmptyObjects, {
      deep: true,
    });

    const sortedJson = sortKeys(minimalJson, { deep: true });

    writeFileSync(diffPath, JSON.stringify(sortedJson, null, 2));

    console.log(`${diffPath} re-formatted, keys sorted, and simplified`);

    // add `"x-octokit".diff` to schemas
    addDiffExtensions(sortedJson, fromPath, toPath);
    addDiffExtensions(
      sortedJson,
      fromPath.replace(".deref", ""),
      toPath.replace(".deref", "")
    );

    // add diff files
    createDiffVersion(toPath, latestGhesVersion);
    createDiffVersion(toPath.replace(".deref", ""), latestGhesVersion);
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

function toFromFilename(path, latestGhesVersion) {
  const filename = basename(path);
  if (filename.startsWith("github.ae")) {
    return "api.github.com.deref.json";
  }

  if (filename.startsWith("ghec")) {
    return "api.github.com.deref.json";
  }

  if (filename.startsWith(`ghes-${latestGhesVersion}`)) {
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

function toAniccaDiffFilename(path, latestGhesVersion) {
  const filename = basename(path);
  const fromFilename = toFromFilename(filename, latestGhesVersion);
  return filename.replace(".deref.json", `-anicca-diff-to-${fromFilename}`);
}

function toDiffFilename(path, latestGhesVersion) {
  const filename = basename(path);
  const fromFilename = toFromFilename(filename, latestGhesVersion);

  if (filename.includes(".deref")) {
    return filename.replace(/\.deref\.json/, `-diff-to-${fromFilename}`);
  }

  return filename.replace(
    /\.json/,
    `-diff-to-${fromFilename.replace(".deref", "")}`
  );
}

function filenameToVersion(filename) {
  return filename.replace(/^generated\//, "").replace(/(\.deref)?\.json$/, "");
}

function removeUnchangedKeys(key, value) {
  if (value === null) {
    return mapObj.mapObjectSkip;
  }

  // we don't care about description changes
  if (
    (key === "description" || key === "description_changed") &&
    typeof value === "object" &&
    equal(Object.keys(value).sort(), ["from", "to"])
  ) {
    return mapObj.mapObjectSkip;
  }

  // we also don't care about operation summary changes
  if (
    key === "summary" &&
    typeof value === "object" &&
    equal(Object.keys(value).sort(), ["from", "to"])
  ) {
    return mapObj.mapObjectSkip;
  }

  if (equal(Object.keys(value).sort(), ["added", "changed", "removed"])) {
    value.changed = mapObj(value.changed, removeEmptyObjects);
  }

  if (equal(value, { added: [], changed: {}, removed: [] })) {
    return mapObj.mapObjectSkip;
  }

  if (equal(value, { added: [], removed: [] })) {
    return mapObj.mapObjectSkip;
  }

  if (
    equal(Object.keys(value).sort(), [
      "operations_added",
      "operations_changed",
      "operations_removed",
    ])
  ) {
    value.operations_changed = mapObj(
      value.operations_changed,
      removeEmptyObjects
    );

    if (
      equal(value, {
        operations_added: [],
        operations_changed: {},
        operations_removed: [],
      })
    ) {
      return mapObj.mapObjectSkip;
    }
  }

  return [key, value];
}

function removeNullValues(key, value) {
  if (value === null) {
    return mapObj.mapObjectSkip;
  }

  return [key, value];
}

function simplifyRemovedArrays(key, value) {
  if (key !== "removed") return [key, value];

  if (!Array.isArray(value) || !Array.isArray(value[0])) return [key, value];

  return [key, value.map(([removedKey]) => removedKey)];
}

function removeEmptyObjects(key, value) {
  if (equal(value, {})) {
    return mapObj.mapObjectSkip;
  }

  return [key, value];
}

function removeDeepEmptyObjects(key, value) {
  if (isEmptyDeep(value)) {
    return mapObj.mapObjectSkip;
  }

  return [key, value];
}

function isEmptyDeep(obj) {
  if (_.isObject(obj)) {
    if (Object.keys(obj).length === 0) return true;
    return _.every(_.map(obj, (v) => isEmptyDeep(v)));
  } else if (_.isString(obj)) {
    return !obj.length;
  }
  return false;
}

function addDiffToOperations(version, schema, diff = {}, type) {
  for (const [path, methods] of Object.entries(diff)) {
    for (const method of Object.keys(methods)) {
      const operation = schema.paths[path][method];

      operation["x-octokit"] = {
        ...operation["x-octokit"],
        diff: {
          [version]: { type },
        },
      };
    }
  }
}

function addRemovedOperations(
  fromVersion,
  toVersion,
  schema,
  diffSchema,
  diff = {}
) {
  for (const [path, methods] of Object.entries(diff)) {
    for (const method of methods) {
      if (!schema.paths[path]) {
        schema.paths[path] = {};
      }

      // leave out some properties
      const {
        requestBody,
        parameters,
        responses,
        "x-github": _ignore,
        ...diffOperation
      } = diffSchema.paths[path][method];

      let toVersionOutput = toVersion;
      if (toVersion.startsWith("ghes-")) {
        toVersionOutput = `GitHub Enterprise Server ${toVersion.replace(
          "ghes-",
          ""
        )}`;
      } else if (toVersion.indexOf("github.ae") >= 0) {
        toVersionOutput = `GitHub AE`;
      }

      let fromVersionOutput = fromVersion;
      if (fromVersion.startsWith("ghes-")) {
        fromVersionOutput = fromVersion.replace("ghes-", "");
      }

      let description;
      if (toVersion.startsWith("ghes-")) {
        description = `This endpoint does not exist in ${toVersionOutput}. It was added in ${fromVersionOutput}`;
      } else {
        description = `This endpoint is currently not supported by ${toVersionOutput}. It only exists in ${fromVersionOutput} right now.`;
      }

      schema.paths[path][method] = {
        ...diffOperation,
        responses: {
          501: {
            description: "Not Implemented",
          },
        },
        description,
        "x-octokit": {
          [fromVersion]: "removed",
        },
      };
    }
  }
}

function addDiffExtensions(diffJson, fromPath, toPath) {
  const fromJson = require(`../${fromPath}`);
  const toJson = require(`../${toPath}`);

  const { added, removed, changed } = diffJson.paths;
  const from = filenameToVersion(fromPath);
  const to = filenameToVersion(toPath);

  addDiffToOperations(from, toJson, added, "added");
  addDiffToOperations(from, toJson, changed, "changed");
  addRemovedOperations(from, to, toJson, fromJson, removed);

  writeFileSync(toPath, JSON.stringify(toJson, null, 2));

  console.log(`"x-octokit".diff extension added to ${toPath}`);
}

function createDiffVersion(path, latestGhesVersion) {
  const schema = require(`../${path}`);
  const newPaths = {};
  let refs = new Set();

  // remove all paths that didn't change and keep track of refs
  for (const [path, methods] of Object.entries(schema.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation["x-octokit"]?.diff) continue;

      _.set(newPaths, `${path}.${method}`, operation);
      refs = new Set([...refs, ...findRefs(operation, refs)]);
    }
  }
  schema.paths = newPaths;

  // go through all refs recursively
  refs.forEach((ref) => {
    const component = _.get(schema, ref);
    findAllRefs(schema, component, refs);
  });

  // remove all components that didn't change
  const newComponents = {};
  refs.forEach((ref) => {
    _.set(newComponents, ref, _.get(schema, ref));
  });
  schema.components = newComponents.components;

  console.log("%d components left over", refs.size);

  const newPath = "generated/" + toDiffFilename(path, latestGhesVersion);

  writeFileSync(newPath, JSON.stringify(schema, null, 2));

  console.log("%s updated", newPath);
}

function findRefs(obj) {
  const newRefs = new Set();
  mapObj(
    obj,
    (key, value) => {
      // In our SCIM APIs, we have actual attributes called `$ref` which aren't
      // references to be unfurled.
      if (
        key === "$ref" &&
        typeof value === "string" &&
        value.startsWith("#/")
      ) {
        // value is e.g. "#/components/parameters/per-page"
        newRefs.add(value.substr(2).replace(/\//g, "."));
      }

      return [key, value];
    },
    { deep: true }
  );

  return newRefs;
}

function findAllRefs(schema, component, refs) {
  const newRefs = findRefs(component);

  newRefs.forEach((ref) => {
    if (refs.has(ref)) return;
    refs.add(ref);

    findAllRefs(schema, _.get(schema, ref), refs);
  });
}
