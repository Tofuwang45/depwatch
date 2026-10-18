import { slackChannel } from "eve/channels/slack";

// Reads SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET from the environment. To use
// Vercel Connect instead, run `npx eve add channel/slack`.
export default slackChannel();
