import { defineEval } from "eve/evals";

import { scanStubs } from "../fixtures.ts";

export default defineEval({
  description: "Stays silent with no_reply when a scheduled scan finds nothing.",
  tags: ["scan"],
  async test(t) {
    const session = await t.session({ stubs: scanStubs() });
    await session.send(
      "Run the weekly depwatch scan for: acme/api. Post one digest. If nothing is act-now or plan priority and nothing is a major version behind, call no_reply.",
    );
    t.succeeded();
    t.calledTool("scan_repo", { input: { repo: /^acme\/api$/i } });
    t.calledTool("no_reply", { count: 1 });
  },
});
