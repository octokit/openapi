const SUPPORTED_GHES_OPERATIONS = [3.2, 3.3, 3.4, 3.5];

module.exports = overrides;

function isDeferenced(filename) {
  return /deref/.test(filename);
}

// Updates the operation ID for a specific operation. Useful if you want to maintain
// the function name in `plugin-rest-endpoint-methods.js` when the operation ID has
// been changed in the OpenAPI specification.
//
// Throws an error if an operation is not found for the specified path and HTTP method.
function rewriteOperationId(schema, path, httpMethod, operationId) {
  if (!schema.paths[path]) {
    throw `Path ${path} found not found in schema`;
  }

  if (!schema.paths[path][httpMethod]) {
    throw `HTTP method ${httpMethod} not found for path ${path} in schema`;
  }
  
  schema.paths[path][httpMethod].operationId = operationId;
}

// Adds an operation to the OpenAPI specification using JSON data stored in a file.
//
// Throws an error if an operation already exists for the specified path and HTTP method.
function addOperation(schema, path, httpMethod, overridePath) {
  if (schema.paths[path] && schema.paths[path][httpMethod]) {
    throw `Operation \`${httpMethod} ${path}\` already exists`;
  }

  if (!schema.paths[path]) {
    schema.paths[path] = {};
  }

  schema.paths[path][httpMethod] = require(overridePath);
}

function overrides(file, schema) {
  const isGHES = file.startsWith("ghes-");
  const ghesVersion = isGHES
    ? Number(file.match(/(?<=^ghes-)\d\.\d/)[0])
    : null;

  if (isGHES && SUPPORTED_GHES_OPERATIONS.indexOf(ghesVersion) == -1) {
    throw `GHES version ${ghesVersion} is not yet supported. Please check the overrides ` +
          `in \`scripts/overrides/index.js\` to check if they are relevant to this version, ` +
          `and then update \`SUPPORTED_GHES_VERSION\`.`;
  }  

  // remove `{ "type": "array", ...}` entries from `requestBody.content["aplication/json"].schema.anyOf
  // Octokit requires the request body to be set to an object in order to derive the variable name
  for (const [path, methods] of Object.entries(schema.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation.requestBody) continue;
      if (!operation.requestBody.content["application/json"]) continue;

      const requestBodySchema =
        operation.requestBody.content["application/json"].schema;

      if (requestBodySchema.anyOf) {
        requestBodySchema.anyOf = requestBodySchema.anyOf.filter(
          (item) => !item.type || item.type === "object"
        );
      }

      if (requestBodySchema.oneOf) {
        requestBodySchema.oneOf = requestBodySchema.oneOf.filter(
          (item) => !item.type || item.type === "object"
        );
      }
    }
  }

  rewriteOperationId(schema, "/repos/{owner}/{repo}/compare/{basehead}", 'get', 'repos/compare-commits-with-basehead')

  if (isDeferenced(file)) {
    addOperation(schema, "/repos/{owner}/{repo}/compare/{base}...{head}", "get", "./repos-compare-commits.deref.json");
  } else {
    addOperation(schema, "/repos/{owner}/{repo}/compare/{base}...{head}", "get", "./repos-compare-commits.json");
  }

  if (ghesVersion === 3.2 || ghesVersion === 3.3) {
    console.log('Doing 3.2 and 3.3 content ref rewrites');

    rewriteOperationId(schema, "/repos/{owner}/{repo}/content_references/{content_reference_id}/attachments", "post", "apps/create-content-attachment-for-repo");

    if (isDeferenced(file)) {
      addOperation(schema, "/content_references/{content_reference_id}/attachments", "post", "./apps-create-content-attachment.deref.json");
    } else {
      addOperation(schema, "/content_references/{content_reference_id}/attachments", "post", "./apps-create-content-attachment.json")
    }
  }

  if (ghesVersion === 3.2 || ghesVersion === 3.3) {
    if (isDeferenced(file)) {
      addOperation(schema, "/repos/{owner}/{repo}/community/code_of_conduct", "get", "./codes-of-conduct-get-for-repo.deref.json");
    } else {
      addOperation(schema, "/repos/{owner}/{repo}/community/code_of_conduct", "get", "./codes-of-conduct-get-for-repo.json");
    }
  }
}
