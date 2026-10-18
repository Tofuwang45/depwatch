import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_MODEL, resolveModel } from "../agent/lib/model.ts";

test("defaults to the AI Gateway model", () => {
  assert.deepEqual(resolveModel({}), { model: DEFAULT_MODEL, local: false });
  assert.deepEqual(resolveModel({ DEPWATCH_MODEL: "anthropic/claude-haiku-5-5" }), {
    model: "anthropic/claude-haiku-5-5",
    local: false,
  });
});

test("ollama: selects a local OpenAI-compatible model", () => {
  const { model, local } = resolveModel({ DEPWATCH_MODEL: "ollama:qwen3:8b" });
  assert.equal(local, true);
  assert.equal(typeof model === "object" && model.modelId, "qwen3:8b");
});
