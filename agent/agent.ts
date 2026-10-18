import { defineAgent } from "eve";

import { resolveModel } from "#lib/model.ts";

const { model, local } = resolveModel();

export default defineAgent({
  model,
  reasoning: "medium",
  // Local servers report no context metadata; match OLLAMA_CONTEXT_LENGTH.
  ...(local ? { modelContextWindowTokens: 64_000 } : {}),
  // Read-only by design: no bash, file, or web tools. The model can only call
  // the tools in agent/tools/.
  defaultTools: false,
  limits: {
    maxTokenCostUsdPerSession: 0.5,
    maxOutputTokensPerSession: 20_000,
  },
});
