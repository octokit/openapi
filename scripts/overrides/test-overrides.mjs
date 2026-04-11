/**
 * Tests that the generated OpenAPI schemas have correct structure after
 * overrides are applied. Catches drift if upstream changes the anyOf
 * patterns or if the override logic regresses.
 *
 * Run: node scripts/overrides/test-overrides.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
    console.error(`    expected: ${e}`);
    console.error(`    actual:   ${a}`);
  }
}

// ─── Load generated schemas ─────────────────────────────────────────────
const deref = JSON.parse(
  readFileSync(resolve(root, "generated/api.github.com.deref.json"), "utf-8"),
);
const ref = JSON.parse(
  readFileSync(resolve(root, "generated/api.github.com.json"), "utf-8"),
);

// ─── /app/installations response items (dereferenced) ───────────────────
console.log("\n/app/installations (dereferenced):");

const derefItems =
  deref.paths["/app/installations"].get.responses["200"].content[
    "application/json"
  ].schema.items;

// account: must be allOf (not anyOf) + nullable
const derefAccount = derefItems.properties.account;
assert(!derefAccount.anyOf, "account must not have anyOf");
assert(Array.isArray(derefAccount.allOf), "account must have allOf array");
assert(derefAccount.nullable === true, "account must be nullable");
assert(!derefAccount.type, "account must not have type (removed array form)");
assert(
  derefAccount.allOf.length === 2,
  "account.allOf must have 2 entries (SimpleUser + Enterprise)",
);
assert(
  derefAccount.allOf.some((e) => e.title === "Simple User"),
  "account.allOf must contain Simple User",
);
assert(
  derefAccount.allOf.some((e) => e.title === "Enterprise"),
  "account.allOf must contain Enterprise",
);

// suspended_by: must be a flat object with nullable (not anyOf)
const derefSb = derefItems.properties.suspended_by;
assert(!derefSb.anyOf, "suspended_by must not have anyOf");
assert(derefSb.nullable === true, "suspended_by must be nullable");
assert(derefSb.type === "object", "suspended_by must be type:object");
assert(
  derefSb.title === "Simple User",
  "suspended_by must have title 'Simple User'",
);
assert(
  derefSb.properties && Object.keys(derefSb.properties).length > 0,
  "suspended_by must have properties",
);
assert(
  Array.isArray(derefSb.required) && derefSb.required.includes("login"),
  "suspended_by must have required fields including 'login'",
);

// Verify no residual anyOf anywhere in the items properties that we patch
assert(
  !derefItems.properties.account.anyOf,
  "no residual anyOf on account after patch",
);
assert(
  !derefItems.properties.suspended_by.anyOf,
  "no residual anyOf on suspended_by after patch",
);

// permissions: must exist and have known permission keys
const derefPerms = derefItems.properties.permissions?.properties;
assert(derefPerms, "permissions.properties must exist");
if (derefPerms) {
  const knownPerms = [
    "actions",
    "contents",
    "issues",
    "metadata",
    "pull_requests",
    "workflows",
  ];
  for (const perm of knownPerms) {
    assert(derefPerms[perm], `permissions must include '${perm}'`);
  }
  // Verify permission enum pattern (read, write, or both)
  for (const [key, val] of Object.entries(derefPerms)) {
    assert(val.type === "string", `permissions.${key} must be type:string`);
    assert(
      Array.isArray(val.enum) &&
        (val.enum.includes("read") || val.enum.includes("write")),
      `permissions.${key} must have enum including 'read' or 'write'`,
    );
  }
}

// ─── installation component (referenced schema) ────────────────────────
console.log("/app/installations (referenced):");

const installation = ref.components.schemas.installation;
assert(installation, "installation component must exist");

if (installation) {
  // account: must be allOf (not anyOf) + nullable
  const refAccount = installation.properties.account;
  assert(!refAccount.anyOf, "account must not have anyOf");
  assert(Array.isArray(refAccount.allOf), "account must have allOf array");
  assert(refAccount.nullable === true, "account must be nullable");
  assert(!refAccount.type, "account must not have type");
  assert(refAccount.allOf.length === 2, "account.allOf must have 2 entries");

  // suspended_by: must not have anyOf
  const refSb = installation.properties.suspended_by;
  assert(!refSb.anyOf, "suspended_by must not have anyOf");
  // In ref schema, this resolves to a $ref to nullable-simple-user
  // which is fine — the key thing is no anyOf
  assert(
    refSb.nullable === true || refSb["$ref"]?.includes("nullable"),
    "suspended_by must be nullable (via flag or $ref name)",
  );

  // permissions: must exist with known keys
  const refPerms = installation.properties.permissions;
  assert(refPerms, "permissions property must exist on installation");
}

// ─── Verify no anyOf remains on patched fields across ALL generated files ─
console.log("Cross-file anyOf absence check:");

const generatedFiles = [
  "api.github.com.deref.json",
  "api.github.com.json",
  "ghec.deref.json",
  "ghec.json",
];

for (const file of generatedFiles) {
  let schema;
  try {
    schema = JSON.parse(
      readFileSync(resolve(root, `generated/${file}`), "utf-8"),
    );
  } catch {
    continue; // file might not exist in all builds
  }

  const op = schema.paths?.["/app/installations"]?.get;
  if (!op) continue;

  const isDereferenced = file.includes(".deref.");

  if (isDereferenced) {
    const items = op.responses["200"].content["application/json"].schema.items;
    assert(
      !items.properties.account.anyOf,
      `[${file}] account must not have anyOf`,
    );
    assert(
      !items.properties.suspended_by.anyOf,
      `[${file}] suspended_by must not have anyOf`,
    );
  } else {
    const inst = schema.components?.schemas?.installation;
    if (inst) {
      assert(
        !inst.properties.account.anyOf,
        `[${file}] installation.account must not have anyOf`,
      );
      assert(
        !inst.properties.suspended_by.anyOf,
        `[${file}] installation.suspended_by must not have anyOf`,
      );
    }
  }
}

// ─── Verify request body anyOf filtering still works ────────────────────
console.log("Request body anyOf filtering:");

// The overrides also filter request body anyOf entries to remove non-object types
// Check a known endpoint that has this pattern
for (const file of generatedFiles) {
  let schema;
  try {
    schema = JSON.parse(
      readFileSync(resolve(root, `generated/${file}`), "utf-8"),
    );
  } catch {
    continue;
  }

  // Walk all paths looking for request bodies with anyOf containing non-object types
  for (const [pathKey, methods] of Object.entries(schema.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (!op.requestBody?.content?.["application/json"]?.schema) continue;
      const reqSchema = op.requestBody.content["application/json"].schema;
      if (reqSchema.anyOf) {
        for (const entry of reqSchema.anyOf) {
          assert(
            !entry.type || entry.type === "object",
            `[${file}] ${method.toUpperCase()} ${pathKey} requestBody.anyOf must not have non-object types (found ${entry.type})`,
          );
        }
      }
    }
  }
}

// ─── Summary ────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("✅ All override assertions passed");
