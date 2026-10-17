import type { InstalledPackage } from "./lockfile.ts";
import { compareVersions } from "./semver.ts";
import { cleanUntrustedText } from "./untrusted.ts";

export type Fetch = typeof fetch;

const OSV_API = "https://api.osv.dev/v1";
const NPM_REGISTRY = "https://registry.npmjs.org";
const MAX_LOCKFILE_BYTES = 20 * 1024 * 1024;
const OSV_BATCH_SIZE = 1000;

export type Severity = "critical" | "high" | "moderate" | "low" | "unknown";

export interface Advisory {
  id: string;
  aliases: string[];
  summary: string;
  severity: Severity;
  /** Lowest fixed version at or above the installed one, if OSV knows it. */
  fixedIn?: string;
  url: string;
}

/** Downloads package-lock.json from a public repo's default branch. */
export async function fetchLockfile(repo: string, fetchImpl: Fetch = fetch): Promise<string> {
  const url = `https://raw.githubusercontent.com/${repo}/HEAD/package-lock.json`;
  const response = await fetchImpl(url);
  if (response.status === 404) {
    throw new Error(`${repo} has no package-lock.json at its root, or the repo is not public.`);
  }
  if (!response.ok) {
    throw new Error(`Fetching ${repo}'s package-lock.json failed with HTTP ${response.status}.`);
  }
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_LOCKFILE_BYTES) {
    throw new Error(`${repo}'s package-lock.json is larger than 20 MB; depwatch skips it.`);
  }
  return response.text();
}

/** Returns the OSV advisory ids affecting each package, keyed by `name@version`. */
export async function queryOsv(
  packages: InstalledPackage[],
  fetchImpl: Fetch = fetch,
): Promise<Map<string, string[]>> {
  const hits = new Map<string, string[]>();
  for (let start = 0; start < packages.length; start += OSV_BATCH_SIZE) {
    const batch = packages.slice(start, start + OSV_BATCH_SIZE);
    const response = await fetchImpl(`${OSV_API}/querybatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        queries: batch.map((pkg) => ({
          package: { name: pkg.name, ecosystem: "npm" },
          version: pkg.version,
        })),
      }),
    });
    if (!response.ok) throw new Error(`OSV querybatch failed with HTTP ${response.status}.`);
    const body = (await response.json()) as { results?: { vulns?: { id: string }[] }[] };
    (body.results ?? []).forEach((result, index) => {
      const ids = (result.vulns ?? []).map((vuln) => vuln.id);
      if (ids.length > 0) {
        const pkg = batch[index]!;
        hits.set(`${pkg.name}@${pkg.version}`, ids);
      }
    });
  }
  return hits;
}

interface OsvVuln {
  id: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  database_specific?: { severity?: string };
  affected?: {
    package?: { name?: string; ecosystem?: string };
    ranges?: { events?: { introduced?: string; fixed?: string }[] }[];
  }[];
}

/** Fetches one advisory and reduces it to the fields depwatch reports. */
export async function getAdvisory(
  id: string,
  pkg: { name: string; version: string } | undefined,
  fetchImpl: Fetch = fetch,
): Promise<Advisory & { details: string }> {
  const response = await fetchImpl(`${OSV_API}/vulns/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`OSV lookup for ${id} failed with HTTP ${response.status}.`);
  const vuln = (await response.json()) as OsvVuln;
  return {
    id: vuln.id,
    aliases: (vuln.aliases ?? []).filter((alias) => /^[A-Z]+-[\w-]+$/.test(alias)).slice(0, 5),
    summary: cleanUntrustedText(vuln.summary),
    details: cleanUntrustedText(vuln.details, 1500),
    severity: normalizeSeverity(vuln.database_specific?.severity),
    fixedIn: pkg ? findFixedVersion(vuln, pkg.name, pkg.version) : undefined,
    url: `https://osv.dev/vulnerability/${encodeURIComponent(vuln.id)}`,
  };
}

export function normalizeSeverity(value: string | undefined): Severity {
  switch (value?.toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "moderate":
    case "medium":
      return "moderate";
    case "low":
      return "low";
    default:
      return "unknown";
  }
}

export function findFixedVersion(vuln: OsvVuln, name: string, installed: string): string | undefined {
  const fixed = (vuln.affected ?? [])
    .filter((affected) => affected.package?.ecosystem === "npm" && affected.package.name === name)
    .flatMap((affected) => affected.ranges ?? [])
    .flatMap((range) => range.events ?? [])
    .map((event) => event.fixed)
    .filter((version): version is string => !!version && compareVersions(version, installed) > 0)
    .sort(compareVersions);
  return fixed[0];
}

/** Latest published version of a package on npm. */
export async function getLatestVersion(name: string, fetchImpl: Fetch = fetch): Promise<string | undefined> {
  const encoded = name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
  const response = await fetchImpl(`${NPM_REGISTRY}/${encoded}/latest`);
  if (!response.ok) return undefined;
  const body = (await response.json()) as { version?: unknown };
  return typeof body.version === "string" ? body.version : undefined;
}
