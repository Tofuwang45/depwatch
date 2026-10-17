import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

import { normalizeText, scanStubs } from "../fixtures.ts";

export default defineEval({
  description: "Lists the watched repos from the tool, not from memory.",
  tags: ["scan"],
  async test(t) {
    const session = await t.session({ stubs: scanStubs() });
    const turn = await session.send("Which repos are you watching?");
    t.succeeded();
    t.calledTool("list_watched_repos", { count: 1 });
    t.notCalledTool("scan_repo");
    t.check(normalizeText(turn.message), includes(/acme\/web/i)).label("lists-web");
    t.check(normalizeText(turn.message), includes(/acme\/api/i)).label("lists-api");
    // It has not scanned anything, so it must not report scan results.
    t.score({ score: /packages scanned|\bfindings?\b|GHSA-/i.test(normalizeText(turn.message)) ? 0 : 1 })
      .label("no-unscanned-claims")
      .gate(1);
  },
});
