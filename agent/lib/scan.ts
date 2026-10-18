import { parseLockfile } from "./lockfile.ts";
import type { InstalledPackage } from "./lockfile.ts";
import { versionGap } from "./semver.ts";
import { fetchLockfile, getAdvisory, getLatestVersion, queryOsv } from "./sources.ts";
import type { Advisory, Fetch, Severity } from "./sources.ts";

/** Advisory details are fetched for at most this many ids per scan. */
const MAX_ADVISORIES = 40;
const MAX_OUTDATED_CHECKS = 60;

export type Priority = "act-now" | "plan" | "low";

export interface Finding {
  package: string;
  version: string;
  dev: boolean;
  direct: boolean;
  advisory: Advisory;
  priority: Priority;
  /** The exact fix to quote, so the model never has to compose a command. */
  remediation: string;
}

export interface Outdated {
  package: string;
  installed: string;
  latest: string;
  gap: "major" | "minor" | "patch";
  dev: boolean;
}

export interface ScanReport {
  repo: string;
  scannedAt: string;
  packageCount: number;
  findings: Finding[];
  outdated: Outdated[];
  /** Advisories that matched but were not fetched because of MAX_ADVISORIES. */
  omittedAdvisories: number;
}

const SEVERITY_SCORE: Record<Severity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  unknown: 2,
};

/**
 * Ranks a finding from facts only, so the model explains priorities instead of
 * inventing them: severity, whether it ships to production, whether the repo
 * depends on it directly, and whether a fix exists.
 */
export function prioritize(pkg: Pick<InstalledPackage, "dev" | "direct">, advisory: Advisory): Priority {
  let score = SEVERITY_SCORE[advisory.severity];
  if (pkg.dev) score -= 2;
  if (pkg.direct) score += 1;
  if (!advisory.fixedIn) score -= 1;
  if (score >= 4) return "act-now";
  if (score >= 2) return "plan";
  return "low";
}

/**
 * Spells out the fix for a finding: an install command for a direct dependency,
 * an `overrides` entry for a transitive one, or a plain statement that no fix
 * has shipped.
 */
export function remediation(pkg: Pick<InstalledPackage, "name" | "direct">, fixedIn: string | undefined): string {
  if (!fixedIn) return "No fixed version yet";
  if (pkg.direct) return `npm install ${pkg.name}@${fixedIn}`;
  return `Add to package.json: "overrides": { ${JSON.stringify(pkg.name)}: ${JSON.stringify(fixedIn)} }, or upgrade the package that depends on it`;
}

const PRIORITY_ORDER: Record<Priority, number> = { "act-now": 0, plan: 1, low: 2 };

export async function scanRepo(repo: string, fetchImpl: Fetch = fetch): Promise<ScanReport> {
  const packages = parseLockfile(await fetchLockfile(repo, fetchImpl));
  const byKey = new Map(packages.map((pkg) => [`${pkg.name}@${pkg.version}`, pkg]));
  const hits = await queryOsv(packages, fetchImpl);

  const pairs = [...hits].flatMap(([key, ids]) => ids.map((id) => ({ pkg: byKey.get(key)!, id })));
  const fetched = pairs.slice(0, MAX_ADVISORIES);
  const findings = await Promise.all(
    fetched.map(async ({ pkg, id }) => {
      const advisory = await getAdvisory(id, pkg, fetchImpl);
      return {
        package: pkg.name,
        version: pkg.version,
        dev: pkg.dev,
        direct: pkg.direct,
        advisory,
        priority: prioritize(pkg, advisory),
        remediation: remediation(pkg, advisory.fixedIn),
      } satisfies Finding;
    }),
  );
  findings.sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      SEVERITY_SCORE[b.advisory.severity] - SEVERITY_SCORE[a.advisory.severity],
  );

  const direct = packages.filter((pkg) => pkg.direct).slice(0, MAX_OUTDATED_CHECKS);
  const outdated = (
    await Promise.all(
      direct.map(async (pkg): Promise<Outdated | undefined> => {
        const latest = await getLatestVersion(pkg.name, fetchImpl);
        if (!latest) return undefined;
        const gap = versionGap(pkg.version, latest);
        if (gap === "none") return undefined;
        return { package: pkg.name, installed: pkg.version, latest, gap, dev: pkg.dev };
      }),
    )
  ).filter((entry): entry is Outdated => entry !== undefined && entry.gap === "major");

  return {
    repo,
    scannedAt: new Date().toISOString(),
    packageCount: packages.length,
    findings,
    outdated,
    omittedAdvisories: pairs.length - fetched.length,
  };
}
