import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-6-luna-fast",
  reasoning: "medium",
  // Read-only by design: no bash, file, or web tools, so no sandbox. The model
  // can only call the tools in agent/tools/.
  defaultTools: false,
  limits: {
    maxTokenCostUsdPerSession: 0.5,
    maxOutputTokensPerSession: 20_000,
  },
});
