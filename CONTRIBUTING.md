# How to contribute

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.

We appreciate you taking the time to contribute to `@octokit/openapi`. Especially as a new contributor, you have a valuable perspective that we lost a long time ago: you will find things confusing and run into problems that no longer occur to us. Please share them with us, so we can make the experience for future contributors the best it could be.

Thank you 💖

## How it all works

I've recorded a video where I work through an update coming from GitHub's official OpenAPI spec.

<a href="https://youtu.be/xDTHbL5qcvQ"><img width="1281" alt="Screenshot of YouTube's video player" src="https://user-images.githubusercontent.com/39992/116304358-567da400-a757-11eb-8f8e-3634e754f672.png"></a>

Find more details or ask questions at https://github.com/gr2m/helpdesk/issues/5

## Setup the repository locally

First, fork the repository.

Setup the repository locally. Replace `<your account name>` with the name of the account you forked to.

```shell
git clone https://github.com/<your account name>/openapi.git
cd openapi
npm install
```

### Download the latest official OpenAPI specifications from GitHub

```shell
npm run download
```

### Generate the schemas with the `x-octokit` extension

This command relies on a tool called annica. [`anicca`](https://github.com/xuorig/anicca) is created by Marc-André aka [@xuorig](https://github.com/xuorig), who is working on GitHub's OpenAPI spec and the surrounding tooling. It was needed an OpenAPI diff tool and all the tools found couldn't handle the size of GitHub's spec, which is why [@xuorig](https://github.com/xuorig) created `anicca` in the first place.

It's written in Rust and there is no pre-compiled binary yet that could just run. Once there is the whole setup will become simpler. Until then, the user needs to:

1. Clone [anicca's repository](https://github.com/xuorig/anicca) repository
2. [Install Rust](https://doc.rust-lang.org/cargo/getting-started/installation.html) (if it's not installed yet)
3. Define `ANICCA_REPOSITORY_PATH` environment variable pointing to the path where you cloned anicca's repository.

```shell
ANICCA_REPOSITORY_PATH='<path_to_my_local_anicca_repo>' npm run build
```

## Submitting a manual Pull Request

- **Do not** submit a pull request that edits an OpenAPI operation. These changes need to be done in https://github.com/github/rest-api-description/.
- Create a new branch locally.
- Make your changes in that branch and push them to your fork
- Submit a pull request from your topic branch to the main branch on the `octokit/openapi` repository.
- Be sure to tag any issues your pull request is taking care of / contributing to. Adding "Closes #123" to a pull request description will automatically close the issue once the pull request is merged in.

## Maintainers only

### Reviewing an automated OpenAPI update pull request

1. Review the changes.
   1. If there are only description updates, change the PR title to something like `fix: comment updates`. The `fix:` prefix in the squash & merge commit header is important to calculate the next version.
   2. If there are any additions, use a `feat:` prefix.
   3. If there are breaking changes, try to address them by adding an entry to [changes/](https://github.com/octokit/openapi/tree/main/changes). Avoid breaking changes if at all possible.
   4. If endpoints have been removed which happens occasionally, release a breaking change of `octokit/openapi` and the `octokit/(openapi-)types.ts` repository, in order to prevent TypeScript build errors for users. The actual libraries and plugins can update to the new breaking versions as part of a fix release.

### Merging the Pull Request & releasing a new version

Releases are automated using [semantic-release](https://github.com/semantic-release/semantic-release).
The following commit message conventions determine which version is released:

1. `fix: ...` or `fix(scope name): ...` prefix in subject: bumps fix version, e.g. `1.2.3` → `1.2.4`
2. `feat: ...` or `feat(scope name): ...` prefix in subject: bumps feature version, e.g. `1.2.3` → `1.3.0`
3. `BREAKING CHANGE:` in body: bumps breaking version, e.g. `1.2.3` → `2.0.0`

Only one version number is bumped at a time, the highest version change trumps the others.
Besides publishing a new version to npm, semantic-release also creates a git tag and release
on GitHub, generates changelogs from the commit messages and puts them into the release notes.

If the pull request looks good but does not follow the commit conventions, use the <kbd>Squash & merge</kbd> button.
