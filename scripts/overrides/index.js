module.exports = overrides;

function overrides(file, schema) {
  const isGHES = file.startsWith("ghes-");
  const ghesVersion = isGHES
    ? Number(file.match(/(?<=^ghes-)\d\.\d/)[0])
    : null;

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
  if (schema.paths["/repos/{owner}/{repo}/compare/{basehead}"]) {
    // update operation ID for new endpoint
    schema.paths["/repos/{owner}/{repo}/compare/{basehead}"].get.operationId =
      "repos/compare-commits-with-basehead";

    // recove all endpoints
    schema.paths["/repos/{owner}/{repo}/compare/{base}...{head}"] = {
      get: /deref/.test(file)
        ? require("./repos-compare-commits.deref.json")
        : require("./repos-compare-commits.json"),
    };
  }

  if (
    schema.paths[
      "/{owner}/{repo}/content_references/{content_reference_id}/attachments"
    ]
  ) {
    schema.paths[
      "/repos/{owner}/{repo}/content_references/{content_reference_id}/attachments"
    ] =
      schema.paths[
        "/{owner}/{repo}/content_references/{content_reference_id}/attachments"
      ];
    delete schema.paths[
      "/{owner}/{repo}/content_references/{content_reference_id}/attachments"
    ];
  }

  // "POST /content_references/{content_reference_id}/attachments" -> "POST /{owner}/{repo}/content_references/{content_reference_id}/attachments"
  if (
    schema.paths[
      "/repos/{owner}/{repo}/content_references/{content_reference_id}/attachments"
    ]
  ) {
    // update operation ID for new endpoint
    schema.paths[
      "/repos/{owner}/{repo}/content_references/{content_reference_id}/attachments"
    ].post.operationId = "apps/create-content-attachment-for-repo";

    // recover all endpoints
    schema.paths["/content_references/{content_reference_id}/attachments"] = {
      post: /deref/.test(file)
        ? require("./apps-create-content-attachment.deref.json")
        : require("./apps-create-content-attachment.json"),
    };
  }

  if (
    file.startsWith("api.github.com") ||
    file.startsWith("github.ae") ||
    file.startsWith("ghes-3.2") ||
    file.startsWith("ghes-3.3")
  ) {
    // recover `GET /repos/{owner}/{repo}/community/code_of_conduct` (with deprecation flags)
    schema.paths["/repos/{owner}/{repo}/community/code_of_conduct"] = {
      get: /deref/.test(file)
        ? require("./codes-of-conduct-get-for-repo.deref.json")
        : require("./codes-of-conduct-get-for-repo.json"),
    };
  }
}
