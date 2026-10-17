import assert from "node:assert/strict";
import { test } from "node:test";

import { compareVersions, versionGap } from "../agent/lib/semver.ts";
import { cleanUntrustedText } from "../agent/lib/untrusted.ts";

test("compares versions numerically", () => {
  assert.ok(compareVersions("4.17.21", "4.17.3") > 0);
  assert.equal(compareVersions("1.0.0-beta.1", "1.0.0"), 0);
});

test("classifies the gap to latest", () => {
  assert.equal(versionGap("1.2.3", "2.0.0"), "major");
  assert.equal(versionGap("1.2.3", "1.3.0"), "minor");
  assert.equal(versionGap("1.2.3", "1.2.4"), "patch");
  assert.equal(versionGap("2.0.0", "1.9.9"), "none");
});

test("cleans and caps untrusted text", () => {
  assert.equal(cleanUntrustedText("a\u0000\n\n b"), "a b");
  assert.equal(cleanUntrustedText("x".repeat(10), 5), "xxxx…");
  assert.equal(cleanUntrustedText(42), "");
});
