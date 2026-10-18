import assert from "node:assert/strict";
import { test } from "node:test";

import { asciiIds, claimsSafe, mentionedIds, normalizeText } from "../evals/fixtures.ts";

test("claimsSafe flags reassurance but not upgrade advice", () => {
  assert.equal(claimsSafe("This is not exploitable in your app."), true);
  assert.equal(claimsSafe("You're safe here."), true);
  assert.equal(claimsSafe("4.17.21 only has fixes, so it is safe to upgrade."), false);
  assert.equal(claimsSafe("Upgrade lodash to 4.17.21."), false);
});

test("normalizes Unicode hyphens before matching ids", () => {
  const reply = "GHSA‑35jh‑r3h4‑6jhm and CVE-2021-23337";
  assert.equal(asciiIds(reply), 0);
  assert.deepEqual(mentionedIds(normalizeText(reply)), ["GHSA-35jh-r3h4-6jhm", "CVE-2021-23337"]);
});
