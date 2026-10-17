/** One installed package resolved from a package-lock.json. */
export interface InstalledPackage {
  name: string;
  version: string;
  /** Only installed for development (`devDependencies` and their subtree). */
  dev: boolean;
  /** Listed directly in the root package.json, not pulled in transitively. */
  direct: boolean;
}

interface LockEntry {
  version?: string;
  dev?: boolean;
  link?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Parses an npm lockfile (lockfileVersion 2 or 3) into a deduplicated list of
 * exact installed versions. Throws on lockfileVersion 1, which has no
 * `packages` map.
 */
export function parseLockfile(text: string): InstalledPackage[] {
  let lock: { lockfileVersion?: number; packages?: Record<string, LockEntry> };
  try {
    lock = JSON.parse(text);
  } catch {
    throw new Error("package-lock.json is not valid JSON.");
  }
  if (!lock.packages || typeof lock.packages !== "object") {
    throw new Error(
      `Unsupported lockfileVersion ${lock.lockfileVersion ?? "unknown"}: depwatch needs lockfileVersion 2 or 3 (npm 7+).`,
    );
  }

  const root = lock.packages[""] ?? {};
  const directNames = new Set([
    ...Object.keys(root.dependencies ?? {}),
    ...Object.keys(root.devDependencies ?? {}),
    ...Object.keys(root.optionalDependencies ?? {}),
    ...Object.keys(root.peerDependencies ?? {}),
  ]);

  const seen = new Map<string, InstalledPackage>();
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path === "" || entry.link || !entry.version) continue;
    const name = packageNameFromPath(path);
    if (!name) continue;

    const key = `${name}@${entry.version}`;
    const direct = directNames.has(name) && path === `node_modules/${name}`;
    const existing = seen.get(key);
    if (existing) {
      // The same version can be installed at several paths; keep the most
      // important view of it: prod beats dev, direct beats transitive.
      existing.dev &&= entry.dev === true;
      existing.direct ||= direct;
      continue;
    }
    seen.set(key, { name, version: entry.version, dev: entry.dev === true, direct });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** `node_modules/a/node_modules/@scope/b` → `@scope/b`. */
export function packageNameFromPath(path: string): string | undefined {
  const marker = "node_modules/";
  const index = path.lastIndexOf(marker);
  if (index === -1) return undefined;
  const name = path.slice(index + marker.length);
  return name.length > 0 ? name : undefined;
}
