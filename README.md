# openapi

> GitHub's official OpenAPI spec with Octokit extensions

[![@latest](https://img.shields.io/npm/v/@octokit/openapi.svg)](https://www.npmjs.com/package/@octokit/openapi)
[![Build Status](https://github.com/octokit/openapi/workflows/Test/badge.svg)](https://github.com/octokit/openapi/actions?query=workflow%3ATest+branch%3Amain)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=octokit/openapi)](https://dependabot.com/)

## Download

Download from https://unpkg.com/browse/@octokit/openapi/generated/

## Node Usage

```js
const { schemas } = require("@octokit/openapi");
const version = schemas["api.github.com"].info.version;
const paths = Object.keys(schemas["api.github.com"].paths.sort());
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
