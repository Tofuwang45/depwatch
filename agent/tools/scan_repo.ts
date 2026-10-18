import { defineTool } from "eve/tools";
import { z } from "zod";

import { scanRepo } from "#lib/scan.ts";
import { assertWatched, getWatchlist } from "#lib/watchlist.ts";

export default defineTool({
  description:
    "Scan a watched repo's package-lock.json for known vulnerabilities (OSV.dev) and direct dependencies that are a major version behind (npm). Findings arrive pre-ranked by priority.",
  inputSchema: z.object({
    repo: z.string().describe("A watched repo in owner/repo form."),
  }),
  async execute({ repo }) {
    assertWatched(repo, getWatchlist());
    return scanRepo(repo);
  },
});
