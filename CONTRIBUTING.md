# Contributing to MergeReceipt

MergeReceipt welcomes focused bug fixes, documentation improvements, portability
work, and deterministic evidence collectors.

## Setup

Node.js 20+ and git are required. CI covers Node 20/22 on Linux, Windows, and
macOS.

Clone or fork the canonical repository using the URL shown by GitHub, then run:

```bash
cd mergereceipt
npm ci
npm test
npm run build
```

Before opening a pull request, run the complete local gate:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run package:check
npm run test:e2e
node dist/cli.js verify
```

## Architecture

The path through the product is intentionally direct:

```text
config + git + commands → evidence → score/verdict → terminal/JSON/GitHub
```

- `src/config/` parses and validates config.
- `src/git/` discovers the real change set without a shell.
- `src/checks/` runs explicitly configured shell commands with limits.
- `src/analysis/` emits test-change and sensitive-file signals.
- `src/scoring/` applies visible policy weights and verdict rules.
- `src/core/verify.ts` orchestrates collectors.
- `src/reporters/` and `src/github/` transport the same report.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the dependency rules.

## Tests and compatibility

- Test behavior at the boundary where users observe it; do not copy
  implementation branches into assertions.
- Git behavior should use real temporary repositories and remotes.
- Keep paths, executable selection, quoting, and cleanup portable. Use Node APIs
  instead of shell-only fixture setup.
- JSON changes must validate against `schemas/report.schema.json` and follow the
  documented versioning policy.
- Scoring changes need a policy rationale, explicit deductions, and README
  updates. Scores are never correctness probabilities.
- Source changes affecting the Action must include a rebuilt
  `dist/action/index.js`; CI rejects stale generated output.

## Pull requests

Keep changes small enough to review. Describe:

- the maintainer problem and intended behavior;
- checks you ran and their results;
- config, JSON, exit-code, or platform compatibility impact;
- command, git, output, token, symlink, and untrusted-PR risks;
- limitations that remain.

Large provider integrations or hosted services need a design discussion first.
The core must remain useful with no account, telemetry, network, or AI key.

Report vulnerabilities through the private process in
[SECURITY.md](SECURITY.md), not a public issue. Participation follows the
[Code of Conduct](CODE_OF_CONDUCT.md).
