/**
 * Normalizes third-party text (advisory summaries, package metadata) before it
 * reaches the model: strips control characters, collapses whitespace, and caps
 * the length so a hostile advisory cannot flood the context.
 */
export function cleanUntrustedText(value: unknown, maxLength = 280): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

const INSTRUCTION_PATTERNS = [
  /\b(?:ignore|disregard|forget)\b(?:\s+(?:all|any|the|your|previous|prior|above|earlier))+\s+(?:instructions|prompts|rules)\b/i,
  /\bsystem\s+(?:override|prompt)\b/i,
  /\b(?:reply|respond|answer)\s+only\s+with\b/i,
  /\bdo\s+not\s+mention\b/i,
];

/**
 * True when third-party text reads like orders to an AI rather than a
 * description of a vulnerability. A cheap heuristic, not a defense: the model
 * still treats all such text as data, and this only lets it tell the user.
 */
export function looksLikeInstructions(text: string): boolean {
  return INSTRUCTION_PATTERNS.some((pattern) => pattern.test(text));
}
