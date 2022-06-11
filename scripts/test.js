const { readdirSync, readFileSync } = require("fs");

const VERIFY_FOLDERS = ["cache", "changes", "generated"];

console.log("Verifying folders: %j", VERIFY_FOLDERS);
const files = VERIFY_FOLDERS.map((folder) =>
  readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .map((file) => `${folder}/${file}`)
).flat();

const errors = [];
for (const file of files) {
  try {
    JSON.parse(readFileSync(file, "utf-8"));
  } catch (error) {
    errors.push({ file, error });
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.log(`${error.file}: ${error.error.message}`);
  }
  process.exit(1);
} else {
  console.log("✅ No errors found");
}
