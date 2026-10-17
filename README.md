# depwatch

An open-source [eve](https://eve.dev) agent that watches the npm dependencies of your GitHub repos. Once a week it checks each repo's `package-lock.json` against [OSV.dev](https://osv.dev) and the npm registry, then posts a short Slack digest of what actually needs attention. Reply in the thread to ask follow-up questions; the session is durable, so the scan stays in context.

Example digest, trimmed, from a scan of `microsoft/vscode` on 2026-10-17:

```text
microsoft/vscode: 17 findings (1,423 packages scanned)
- 🔴 shell-quote@1.10.0: GHSA-pqg4-j6r4-53mv (critical), prod, transitive. Fixed in 1.11.0.
- 🟡 @anthropic-ai/sdk@0.82.0: GHSA-p7fg-763f-g4gf (moderate), prod, direct. Fixed in 0.91.1.
- 🟡 uuid@3.4.0: GHSA-w5hq-g745-h8pq (moderate), prod, transitive. Fixed in 11.1.1.
- Major versions behind: @microsoft/1ds-core-js 3.2.13 → 4.4.5, @types/cookie 0.3.3 → 1.0.0, …
```

## How it works

Plain code collects the facts, and the model only explains them:

| Step | Where |
|---|---|
| Download `package-lock.json` from the repo's default branch | `agent/lib/sources.ts` |
| Resolve exact versions, marking prod or dev and direct or transitive | `agent/lib/lockfile.ts` |
| Look up advisories with OSV `querybatch`, then fetch each one's severity and fixed version | `agent/lib/sources.ts` |
| Rank every finding `act-now`, `plan`, or `low` from severity, prod or dev, direct or transitive, and fix availability | `agent/lib/scan.ts` |
| Check direct dependencies against the latest npm release | `agent/lib/sources.ts` |
| Write the digest and answer follow-ups | `agent/instructions.md`, `agent/skills/triage_vulnerability.md` |

The agent itself:

```text
agent/
├── agent.ts                      # model, defaultTools: false, cost limits
├── instructions.md               # role, digest format, untrusted-content rule
├── sandbox.ts                    # just-bash; never opened
├── tools/
│   ├── list_watched_repos.ts
│   ├── scan_repo.ts              # the whole pipeline above
│   ├── get_advisory.ts           # full OSV record for follow-ups
│   └── no_reply.ts               # stay quiet when there is nothing to report
├── skills/triage_vulnerability.md
├── schedules/weekly_scan.ts      # Mondays 14:00 UTC → Slack
└── channels/
    ├── eve.ts                    # HTTP API and TUI (auth required in production)
    └── slack.ts
```

## Setup

Requires Node.js 24.

```bash
git clone https://github.com/Tofuwang45/depwatch.git
cd depwatch
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Model access through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). Not needed after `npx eve link`. |
| `DEPWATCH_REPOS` | Comma-separated public repos to watch, such as `owner/app,owner/api`. Each needs a `package-lock.json` at its root. |
| `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` | From your Slack app. It needs the `app_mentions:read` and `chat:write` scopes. Set its event Request URL to `https://<deployment>/eve/v1/slack`. |
| `DEPWATCH_SLACK_CHANNEL_ID` | Channel that receives the weekly digest. |

Then chat with the agent locally:

```bash
npm run dev
```

Try "scan owner/app" or "which watched repos have act-now findings?".

`eve dev` doesn't run schedules on their cron. To fire the weekly scan once while developing:

```bash
curl -X POST http://localhost:2000/eve/v1/dev/schedules/weekly_scan
```

## Deploy

```bash
npx eve deploy
```

On Vercel, the schedule becomes a Vercel Cron Job. To use Vercel Connect for Slack credentials instead of environment variables, run `npx eve add channel/slack`.

## Development

```bash
npm test           # unit tests (node:test, network mocked)
npm run typecheck
npx eve build
```

## Limitations

- npm only, and only `package-lock.json` v2 or v3. pnpm and yarn lockfiles are not supported yet.
- Each scan fetches details for at most 40 advisories and checks at most 60 direct dependencies for updates. The digest says when advisories were left out.
- Every run reports every current finding. It doesn't track which ones it reported before.
- depwatch can't see your code, so it can't tell whether a vulnerable API is actually called.

## Security

See [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE)
