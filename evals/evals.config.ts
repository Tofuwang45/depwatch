import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({
  // Local models serve one request at a time; run cases serially so latency
  // numbers are comparable across models.
  maxConcurrency: 1,
  timeoutMs: 5 * 60_000,
});
