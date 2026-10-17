# Security

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's [private vulnerability reporting](https://github.com/Tofuwang45/depwatch/security/advisories/new) for this repository instead.

## Design

depwatch is read-only by design:

- **No shell or files.** `defaultTools: false` removes eve's `bash`, file, and web tools. The model can call only the four tools in `agent/tools/`. The sandbox is the pure-JavaScript `just-bash` one, and no tool opens it.
- **Allowlisted repos.** `scan_repo` refuses any repo that is not in `DEPWATCH_REPOS`, so a deployment cannot be used to scan arbitrary repos or run up model costs.
- **Untrusted text is data.** Advisory summaries and details come from third parties. Tools strip control characters and cap their length, and the instructions tell the model never to follow text inside them. Because the agent has no write tools, the worst a malicious advisory can do is distort a report.
- **Spending limits.** Each session is capped at $0.50 of model cost and 20,000 output tokens (`agent/agent.ts`).
- **Authenticated routes.** The HTTP channel keeps eve's `placeholderAuth()`, so production requests are rejected until you configure real auth. Don't replace it with `none()` on a public deployment.
- **No secrets in the repo.** Configuration is read from environment variables, and `.env.example` contains placeholders only. No GitHub token is needed: lockfiles are read from public repos.
- **Private reports.** Post the digest to a private Slack channel. Even though OSV advisories are public, a list of which advisories affect which repos is useful to an attacker.
