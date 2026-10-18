import { defineTool } from "eve/tools";
import { z } from "zod";

import { getWatchlist } from "#lib/watchlist.ts";

export default defineTool({
  description:
    "List the GitHub repos depwatch is allowed to scan. Returns names only, no scan results: call scan_repo before reporting findings or package counts for any of them.",
  inputSchema: z.object({}),
  async execute() {
    return {
      repos: getWatchlist(),
      note: "Names only. None of these repos has been scanned by this call, so report no findings or package counts for them.",
    };
  },
});
