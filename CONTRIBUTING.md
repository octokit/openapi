# How to contribute

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.

We appreciate you taking the time to contribute to `@octokit/openapi`. Especially as a new contributor, you have a valuable perspective that we lost a long time ago: you will find things confusing and run into problems that no longer occur to us. Please share them with us, so we can make the experience for future contributors the best it could be.

Thank you 💖

## Setup the repository locally

First, fork the repository.

Setup the repository locally. Replace `<your account name>` with the name of the account you forked to.

```shell
git clone https://github.com/<your account name>/openapi.git
cd openapi
npm install
```

Download the latest official OpenAPI specifications from GitHub

```shell
npm run download
```

Generated the schemas with the `x-octokit` extension

```shell
npm run build
```

## Submitting the Pull Request

- Create a new branch locally.
- Make your changes in that branch and push them to your fork
- Submit a pull request from your topic branch to the main branch on the `octokit/openapi` repository.
- Be sure to tag any issues your pull request is taking care of / contributing to. Adding "Closes #123" to a pull request description will automatically close the issue once the pull request is merged in.

## Testing a pull request from github repo locally:

You can install `@octokit/openapi` from each pull request. Replace `[PULL REQUEST NUMBER]`:

```
npm install https://github.pika.dev/octokit/openapi/pr/[PULL REQUEST NUMBER]
```

Once you are done testing, you can revert back to the default module `@octokit/openapi` from npm with `npm install @octokit/openapi`

## Maintainers only

### Merging the Pull Request & releasing a new version

Releases are automated using [semantic-release](https://github.com/semantic-release/semantic-release).
The following commit message conventions determine which version is released:

1. `fix: ...` or `fix(scope name): ...` prefix in subject: bumps fix version, e.g. `1.2.3` → `1.2.4`
2. `feat: ...` or `feat(scope name): ...` prefix in subject: bumps feature version, e.g. `1.2.3` → `1.3.0`
3. `BREAKING CHANGE:` in body: bumps breaking version, e.g. `1.2.3` → `2.0.0`

Only one version number is bumped at a time, the highest version change trumps the others.
Besides publishing a new version to npm, semantic-release also creates a git tag and release
on GitHub, generates changelogs from the commit messages and puts them into the release notes.

Before the publish it runs the `npm run build` script which creates a `pkg/` folder with distributions for browsers, node and Typescript definitions. The contents of the `pkg/` folder are published to the npm registry.

If the pull request looks good but does not follow the commit conventions, use the <kbd>Squash & merge</kbd> button.
