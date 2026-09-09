import { readdirSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERIFY_FOLDERS = ["cache", "changes", "generated"];

console.log("Verifying folders: %j", VERIFY_FOLDERS);
const files = VERIFY_FOLDERS.map((folder) =>
  readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .map((file) => `${folder}/${file}`),
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

// Run override-specific assertions against generated schemas
console.log("\nRunning override assertions...");
try {
  execFileSync("node", [resolve(__dirname, "overrides/test-overrides.mjs")], {
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}
