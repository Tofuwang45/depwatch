/** Parses `1.2.3` (ignoring any `-prerelease` or `+build` suffix). */
export function parseVersion(version: string): [number, number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i]! - right[i]!;
  }
  return 0;
}

/** How far `installed` is behind `latest`. */
export function versionGap(installed: string, latest: string): "major" | "minor" | "patch" | "none" {
  const left = parseVersion(installed);
  const right = parseVersion(latest);
  if (!left || !right || compareVersions(installed, latest) >= 0) return "none";
  if (left[0] !== right[0]) return "major";
  if (left[1] !== right[1]) return "minor";
  return "patch";
}
