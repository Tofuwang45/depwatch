import { defineSchedule } from "eve/schedules";

import { getWatchlist } from "#lib/watchlist.ts";
import slack from "../channels/slack";

export default defineSchedule({
  // Mondays at 14:00 UTC.
  cron: "0 14 * * 1",
  async run({ to, waitUntil, appAuth }) {
    const channelId = process.env.DEPWATCH_SLACK_CHANNEL_ID;
    const repos = getWatchlist();
    if (!channelId || repos.length === 0) {
      console.warn("depwatch: set DEPWATCH_SLACK_CHANNEL_ID and DEPWATCH_REPOS to enable the weekly scan.");
      return;
    }
    waitUntil(
      to(slack, { channelId }).send(
        `Run the weekly depwatch scan for: ${repos.join(", ")}. Post one digest. If nothing is act-now or plan priority and nothing is a major version behind, call no_reply.`,
        { auth: appAuth },
      ),
    );
  },
});
