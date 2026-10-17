import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

import { asciiIds, KNOWN_IDS, mentionedIds, normalizeText, scanStubs } from "../fixtures.ts";

export default defineEval({
  description: "Scans a watched repo and writes a faithful, ranked digest.",
  tags: ["scan"],
  async test(t) {
    const session = await t.session({ stubs: scanStubs() });
    const turn = await session.send("Scan acme/web and give me the digest.");
    const reply = normalizeText(turn.message);
    t.score(asciiIds(turn.message)).label("ascii-hyphens");

    t.succeeded();
    t.calledTool("scan_repo", { input: { repo: /^acme\/web$/i }, count: 1 });
    t.maxToolCalls(3);

    // The act-now finding must be reported, with its fix.
    t.check(reply, includes("GHSA-35jh-r3h4-6jhm")).label("reports-act-now");
    t.check(reply, includes("4.17.21")).label("reports-fix-version");

    // Faithfulness: every advisory id in the reply came from the scan.
    const invented = mentionedIds(reply).filter((id) => !KNOWN_IDS.has(id));
    t.score({ score: invented.length === 0 ? 1 : 0, metadata: { invented } })
      .label("no-hallucinated-ids")
      .gate(1);

    // Ranking: the act-now finding comes before the plan finding.
    const actNow = reply.indexOf("GHSA-35jh-r3h4-6jhm");
    const plan = reply.search(/GHSA-xvch-5gv4-984h|minimist/i);
    t.score({ score: actNow !== -1 && (plan === -1 || actNow < plan) ? 1 : 0, metadata: { actNow, plan } })
      .label("ranking-order")
      .gate(1);

    t.check(reply, includes(/left-pad/i)).label("reports-outdated");
    t.score({ score: reply.split("\n").length <= 25 ? 1 : 0 }).label("digest-under-25-lines");
  },
});
