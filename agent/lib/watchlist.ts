const REPO_PATTERN = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

/**
 * The repos depwatch may scan, from `DEPWATCH_REPOS` (comma-separated
 * `owner/repo`). Tools refuse anything else, so a deployed agent cannot be
 * turned into an open scanner of arbitrary repos.
 */
export function getWatchlist(env: Record<string, string | undefined> = process.env): string[] {
  const raw = env.DEPWATCH_REPOS ?? "";
  const repos = raw
    .split(",")
    .map((repo) => repo.trim())
    .filter((repo) => repo.length > 0);
  for (const repo of repos) {
    if (!REPO_PATTERN.test(repo)) {
      throw new Error(`DEPWATCH_REPOS entry "${repo}" is not in owner/repo form.`);
    }
  }
  return [...new Set(repos)];
}

export function assertWatched(repo: string, watchlist: string[]): void {
  if (!watchlist.some((watched) => watched.toLowerCase() === repo.toLowerCase())) {
    const list = watchlist.length > 0 ? watchlist.join(", ") : "(none configured)";
    throw new Error(
      `${repo} is not on the depwatch watchlist. Watched repos: ${list}. Add it to DEPWATCH_REPOS to scan it.`,
    );
  }
}
