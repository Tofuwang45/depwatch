import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Hosted default, routed through Vercel AI Gateway. */
export const DEFAULT_MODEL = "openai/gpt-6-luna-fast";

/**
 * Resolves `DEPWATCH_MODEL`. `ollama:<name>` (for example `ollama:qwen3:8b`)
 * selects a model served by a local Ollama, which needs no API key; any other
 * value is an AI Gateway model id. Unset uses DEFAULT_MODEL.
 */
export function resolveModel(env: Record<string, string | undefined> = process.env) {
  const configured = env.DEPWATCH_MODEL?.trim() || DEFAULT_MODEL;
  if (!configured.startsWith("ollama:")) return { model: configured, local: false } as const;

  const ollama = createOpenAICompatible({
    name: "ollama",
    baseURL: env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    includeUsage: true,
  });
  return { model: ollama(configured.slice("ollama:".length)), local: true } as const;
}
