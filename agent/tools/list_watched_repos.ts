import { defineTool } from "eve/tools";
import { z } from "zod";

import { getWatchlist } from "#lib/watchlist.ts";

export default defineTool({
  description:
    "List the GitHub repos depwatch is allowed to scan. Returns names only, with no scan data: answer with just the names, and call scan_repo before describing any repo's dependencies.",
  inputSchema: z.object({}),
  async execute() {
    return {
      repos: getWatchlist(),
      note: "Repo names only, with no scan data. Reply with just the names; scan results exist only after scan_repo runs.",
    };
  },
});
