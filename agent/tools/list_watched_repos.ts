import { defineTool } from "eve/tools";
import { z } from "zod";

import { getWatchlist } from "#lib/watchlist.ts";

export default defineTool({
  description: "List the GitHub repos depwatch is allowed to scan.",
  inputSchema: z.object({}),
  async execute() {
    return { repos: getWatchlist() };
  },
});
