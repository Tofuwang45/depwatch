import assert from "node:assert/strict";
import { test } from "node:test";

import { assertWatched, getWatchlist } from "../agent/lib/watchlist.ts";

test("reads and dedupes DEPWATCH_REPOS", () => {
  assert.deepEqual(getWatchlist({ DEPWATCH_REPOS: " a/b, c/d.js ,a/b," }), ["a/b", "c/d.js"]);
  assert.deepEqual(getWatchlist({}), []);
});

test("rejects malformed entries", () => {
  assert.throws(() => getWatchlist({ DEPWATCH_REPOS: "https://github.com/a/b" }), /owner\/repo/);
});

test("refuses repos that are not watched", () => {
  assert.doesNotThrow(() => assertWatched("A/B", ["a/b"]));
  assert.throws(() => assertWatched("evil/repo", ["a/b"]), /not on the depwatch watchlist/);
});
