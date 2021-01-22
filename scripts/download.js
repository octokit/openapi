const { get } = require("https");
const fs = require("fs");

const { Octokit } = require("@octokit/core");

run().then(() => console.log("done"), console.error);

async function run() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const {
    data: {
      items: [mostRecentPr],
    },
  } = await octokit.request("GET /search/issues", {
    q: "is:open is:pr author:github-openapi-bot",
  });

  const getDescriptionsOptions = {
    owner: "github",
    repo: "rest-api-description",
    path: "descriptions",
    ref: "main",
  };

  if (mostRecentPr) {
    const {
      data: {
        head: { ref },
      },
    } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner: "github",
      repo: "rest-api-description",
      pull_number: mostRecentPr.number,
    });
    getDescriptionsOptions.ref = ref;
    console.log(
      `Open pull requests found by @github-openapi-bot: ${mostRecentPr.html_url}.\nLoading descriptions from "${ref}" branch`
    );
  } else {
    console.log(
      "No open pull requests found by @github-openapi-bot. Loading descriptions from default branch"
    );
  }

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    getDescriptionsOptions
  );

  if (!Array.isArray(data)) {
    throw new Error(
      "https://github.com/github/rest-api-description/tree/main/descriptions is not a directory"
    );
  }

  for (const folder of data) {
    const { name } = folder;
    const ref = getDescriptionsOptions.ref;

    await download(name, `${ref}/descriptions/${name}/${name}.json`);
    await download(
      `${name}.deref`,
      `${ref}/descriptions/${name}/dereferenced/${name}.deref.json`
    );
  }
}

function download(name, remotePath) {
  const path = `cache/${name}.json`;

  const file = fs.createWriteStream(path);
  const url = `https://raw.githubusercontent.com/github/rest-api-description/${remotePath}`;

  console.log("Downloading %s", url);

  return new Promise((resolve, reject) => {
    get(url, (response) => {
      response.pipe(file);
      file
        .on("finish", () =>
          file.close((error) => {
            if (error) return reject(error);
            console.log("%s written", path);
            resolve();
          })
        )
        .on("error", (error) => reject(error.message));
    });
  });
}
