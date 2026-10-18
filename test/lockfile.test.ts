import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { packageNameFromPath, parseLockfile } from "../agent/lib/lockfile.ts";

const fixture = readFileSync(new URL("./fixtures/package-lock.json", import.meta.url), "utf8");

test("parses exact versions with dev and direct flags", () => {
  assert.deepEqual(parseLockfile(fixture), [
    { name: "@scope/util", version: "2.0.0", dev: false, direct: false },
    { name: "left-pad", version: "1.3.0", dev: false, direct: true },
    { name: "lodash", version: "4.17.15", dev: false, direct: true },
    { name: "minimist", version: "1.2.0", dev: true, direct: true },
  ]);
});

test("rejects lockfileVersion 1", () => {
  assert.throws(() => parseLockfile(JSON.stringify({ lockfileVersion: 1, dependencies: {} })), /lockfileVersion 1/);
});

test("rejects invalid JSON", () => {
  assert.throws(() => parseLockfile("{"), /not valid JSON/);
});

test("derives scoped and nested package names", () => {
  assert.equal(packageNameFromPath("node_modules/a/node_modules/@s/b"), "@s/b");
  assert.equal(packageNameFromPath("packages/local"), undefined);
});
