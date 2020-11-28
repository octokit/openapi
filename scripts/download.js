const { get } = require("https");
const fs = require("fs");

const { Octokit } = require("@octokit/core");

run().then(() => console.log("done"), console.error);

async function run() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const { data } = await octokit.request(
    "GET /repos/:owner/:repo/contents/:path",
    {
      owner: "github",
      repo: "rest-api-description",
      path: "descriptions",
    }
  );

  if (!Array.isArray(data)) {
    throw new Error(
      "https://github.com/github/rest-api-description/tree/main/descriptions is not a directory"
    );
  }

  for (const folder of data) {
    const { name } = folder;

    await download(name, `descriptions/${name}/${name}.json`);
    await download(
      `${name}.deref`,
      `descriptions/${name}/dereferenced/${name}.deref.json`
    );
  }
}

function download(name, remotePath) {
  const path = `cache/${name}.json`;

  const file = fs.createWriteStream(path);
  const url = `https://raw.githubusercontent.com/github/rest-api-description/main/${remotePath}`;

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
