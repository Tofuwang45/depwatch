/**
 * Runs the eve eval suite against each model several times and writes
 * benchmarks/results.json and benchmarks/RESULTS.md.
 *
 *   node scripts/benchmark.ts [--runs 3] [model ...]
 *
 * Models use DEPWATCH_MODEL syntax: `ollama:<name>` for a local Ollama model
 * (no API key), or an AI Gateway id such as `openai/gpt-6-luna-fast`.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_MODELS = ["ollama:qwen3:8b", "ollama:gpt-oss:20b"];
const EVALS_DIR = ".eve/evals";

interface Assertion {
  name: string;
  key?: string;
  score?: number;
  severity: "gate" | "soft";
  passed?: boolean;
  errored: boolean;
}

interface EvalRun {
  id: string;
  verdict: string;
  assertions: Assertion[];
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  models: string[];
}

function parseArgs(argv: string[]) {
  let runs = 3;
  const models: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runs") runs = Number(argv[++i]);
    else models.push(argv[i]!);
  }
  if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs must be a positive integer");
  return { runs, models: models.length > 0 ? models : DEFAULT_MODELS };
}

function newestRunDir(): string {
  const dirs = readdirSync(EVALS_DIR)
    .map((name) => join(EVALS_DIR, name))
    .filter((path) => statSync(path).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!dirs[0]) throw new Error("eve eval wrote no artifacts");
  return dirs[0];
}

function readRun(dir: string): EvalRun[] {
  const lines = readFileSync(join(dir, "results.jsonl"), "utf8").split("\n").filter(Boolean);
  return lines.map((line) => {
    const result = JSON.parse(line) as { id: string; verdict: string; assertions: Assertion[] };
    const base = join(dir, "evals", result.id);
    let latencyMs = 0;
    let usage = { inputTokens: 0, outputTokens: 0 };
    let toolCalls = 0;
    let models: string[] = [];
    try {
      const detail = JSON.parse(readFileSync(`${base}.json`, "utf8"));
      usage = { ...usage, ...detail.result?.derived?.usage };
      toolCalls = detail.result?.derived?.toolCallCount ?? 0;
      models = detail.result?.derived?.models ?? [];
      const times = readFileSync(`${base}.events.ndjson`, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((event) => Date.parse(JSON.parse(event).meta?.at))
        .filter((time) => !Number.isNaN(time));
      if (times.length > 1) latencyMs = Math.max(...times) - Math.min(...times);
    } catch {
      // An errored eval may have no detail artifacts; keep zeros.
    }
    return {
      id: result.id,
      verdict: result.verdict,
      assertions: result.assertions,
      latencyMs,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      toolCalls,
      models,
    };
  });
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const pct = (value: number) => `${Math.round(value * 100)}%`;

function main() {
  const { runs, models } = parseArgs(process.argv.slice(2));
  const results: Record<string, EvalRun[][]> = {};

  for (const model of models) {
    results[model] = [];
    for (let run = 1; run <= runs; run++) {
      console.log(`▶ ${model} run ${run}/${runs}`);
      const child = spawnSync("npx", ["eve", "eval", "--skip-report"], {
        env: { ...process.env, DEPWATCH_MODEL: model },
        stdio: "inherit",
      });
      if (child.status === 2) throw new Error(`eve eval configuration error for ${model}`);
      results[model].push(readRun(newestRunDir()));
    }
  }

  mkdirSync("benchmarks", { recursive: true });
  writeFileSync("benchmarks/results.json", `${JSON.stringify({ generatedAt: new Date().toISOString(), runs, results }, null, 2)}\n`);
  writeFileSync("benchmarks/RESULTS.md", renderMarkdown(results, runs));
  console.log("Wrote benchmarks/RESULTS.md and benchmarks/results.json");
}

function renderMarkdown(results: Record<string, EvalRun[][]>, runs: number): string {
  const models = Object.keys(results);
  const evalIds = [...new Set(Object.values(results).flat(2).map((run) => run.id))].sort();
  const lines: string[] = [];

  lines.push("# depwatch benchmark results", "");
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} with \`node scripts/benchmark.ts --runs ${runs}\`. Each model ran the full eval suite ${runs} times. Every assertion is deterministic, so no judge model or API key is involved.`, "");

  lines.push("## Summary", "");
  lines.push("| Model | Cases passed | Gate checks passed | Mean latency per case | Mean tokens per case (in / out) |");
  lines.push("|---|---|---|---|---|");
  for (const model of models) {
    const all = results[model]!.flat();
    const gates = all.flatMap((run) => run.assertions.filter((a) => a.severity === "gate"));
    lines.push(
      `| \`${model}\` | ${all.filter((run) => run.verdict === "passed").length}/${all.length} (${pct(all.filter((run) => run.verdict === "passed").length / all.length)}) | ${pct(gates.filter((a) => a.passed).length / Math.max(gates.length, 1))} | ${(mean(all.map((run) => run.latencyMs)) / 1000).toFixed(1)} s | ${Math.round(mean(all.map((run) => run.inputTokens))).toLocaleString("en-US")} / ${Math.round(mean(all.map((run) => run.outputTokens))).toLocaleString("en-US")} |`,
    );
  }

  lines.push("", "## Pass rate by case", "");
  lines.push(`| Case | ${models.map((model) => `\`${model}\``).join(" | ")} |`);
  lines.push(`|---|${models.map(() => "---").join("|")}|`);
  for (const id of evalIds) {
    const cells = models.map((model) => {
      const runsForEval = results[model]!.flat().filter((run) => run.id === id);
      const passed = runsForEval.filter((run) => run.verdict === "passed").length;
      return `${passed}/${runsForEval.length}`;
    });
    lines.push(`| \`${id}\` | ${cells.join(" | ")} |`);
  }

  lines.push("", "## Soft metrics", "");
  lines.push("Mean score of checks that are measured but don't fail a case.", "");
  const softKeys = [
    ...new Set(
      Object.values(results)
        .flat(2)
        .flatMap((run) => run.assertions.filter((a) => a.severity === "soft").map((a) => `${run.id} › ${a.key ?? a.name}`)),
    ),
  ].sort();
  lines.push(`| Check | ${models.map((model) => `\`${model}\``).join(" | ")} |`);
  lines.push(`|---|${models.map(() => "---").join("|")}|`);
  for (const softKey of softKeys) {
    const cells = models.map((model) => {
      const scores = results[model]!
        .flat()
        .flatMap((run) =>
          run.assertions
            .filter((a) => a.severity === "soft" && `${run.id} › ${a.key ?? a.name}` === softKey && a.score !== undefined)
            .map((a) => a.score!),
        );
      return scores.length ? pct(mean(scores)) : "–";
    });
    lines.push(`| \`${softKey}\` | ${cells.join(" | ")} |`);
  }

  lines.push("", "## Check failures", "");
  lines.push("Labeled checks that failed in at least one run, with how many runs they failed in.", "");
  let anyFailures = false;
  for (const model of models) {
    const failures = new Map<string, number>();
    for (const run of results[model]!.flat()) {
      for (const assertion of run.assertions) {
        if (assertion.passed === false || assertion.errored) {
          const label = `${run.id} › ${assertion.key ?? assertion.name}`;
          failures.set(label, (failures.get(label) ?? 0) + 1);
        }
      }
    }
    if (failures.size === 0) continue;
    anyFailures = true;
    lines.push(`**\`${model}\`**`, "");
    for (const [label, count] of [...failures].sort((a, b) => b[1] - a[1])) {
      lines.push(`- \`${label}\`: ${count}/${runs}`);
    }
    lines.push("");
  }
  if (!anyFailures) lines.push("None.", "");

  return `${lines.join("\n")}\n`;
}

main();
