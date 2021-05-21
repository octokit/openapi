module.exports = overrides;

function overrides(file, schema) {
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

  // "/repos/{owner}/{repo}/compare/{base}...{head}" -> "/repos/{owner}/{repo}/compare/{basehead}"
  delete schema.paths["/repos/{owner}/{repo}/compare/{basehead}"];
  schema.paths["/repos/{owner}/{repo}/compare/{base}...{head}"] = /deref/.test(
    file
  )
    ? require("./repos-compare-commits.deref.json")
    : require("./repos-compare-commits.json");

  // remove empty `"/user/tokens/reset"` path key
  if (file === "generated/api.github.com.deref.json") {
    if (
      !schema.paths["/user/tokens/reset"] ||
      Object.keys(schema.paths["/user/tokens/reset"]).length
    ) {
      throw new Error(
        `Workaround for "/user/tokens/reset" is no longer needed`
      );
    }

    delete schema.paths["/user/tokens/reset"];
  }
}
