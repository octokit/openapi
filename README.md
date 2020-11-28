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

## GitHub Actions usage

1. Install [Octokit Release Notifier app](https://github.com/apps/octokit-release-notifier/)
2. Create a new workflow file:

```yml
name: Update OpenAPI
on:
  repository_dispatch:
    types: [octokit/openapi-release]

jobs:
  published:
    runs-on: ubuntu-latest
    if: github.event.client_payload.action == 'published'
    steps:
      - run: "echo: 'new release: ${{ github.event.release.tag_name }}'"
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
