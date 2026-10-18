import { eveChannel } from "eve/channels/eve";
import { localDev, placeholderAuth, vercelOidc } from "eve/channels/auth";

const local = localDev();

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev`, the REPL, and `eve eval`; ignored in
    // production. Only local callers may replace tools with eval stubs.
    async (request) => {
      const caller = await local(request);
      return caller ? { ...caller, allowToolStubs: true } : null;
    },
    // Rejects production browser requests until real auth is configured.
    // Don't replace it with none() on a public deployment.
    placeholderAuth(),
  ],
});
