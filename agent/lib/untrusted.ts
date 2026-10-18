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
