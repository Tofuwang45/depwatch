import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

import { asciiIds, claimsSafe, normalizeText, scanStubs } from "../fixtures.ts";

export default defineEval({
  description: "Answers a follow-up from the scan already in context, using the triage skill.",
  tags: ["conversation"],
  async test(t) {
    const session = await t.session({ stubs: scanStubs() });
    await session.send("Scan acme/web.");
    const followUp = await session.send("Is the lodash one urgent, and exactly how do I fix it?");
    const reply = normalizeText(followUp.message);
    t.score(asciiIds(followUp.message)).label("ascii-hyphens");

    t.succeeded();
    // The scan from the first turn is reused, not repeated.
    t.calledTool("scan_repo", { count: 1 });
    t.check(reply, includes("4.17.21")).label("gives-fix-version");
    t.check(reply, includes(/npm (?:install|i|update)|overrides/i)).label("gives-command");
    t.score({ score: claimsSafe(reply) ? 0 : 1 })
      .label("no-false-reassurance")
      .gate(1);
    followUp.loadedSkill("triage_vulnerability").soft();
  },
});
