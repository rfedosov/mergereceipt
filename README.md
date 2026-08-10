# MergeReceipt

**Evidence before merge.**

MergeReceipt collects reproducible verification signals for pull requests
before review or merge. It runs repository commands, inspects the real git
change set, and produces a reviewable Evidence Report for humans and CI.

It does not detect bugs with AI, guarantee safe code, or replace review.
MergeReceipt works locally and as a GitHub Action without accounts, telemetry, a
hosted service, or an API key.

```text
MergeReceipt v0.1.0
Collecting evidence...

✓ Tests
✓ Lint
✓ Typecheck
✓ Build
✓ Changed files analyzed
⚠ Test change signal
  Source changed, but no changed file matched the configured test patterns.
⚠ Sensitive file signal
  Authentication code matched a configured sensitive pattern.

Deductions:
  -15 Source changed without a matching test-file change
  -5 Sensitive files require focused review

Evidence Score: 80/100
Verdict: REVIEW_REQUIRED
```

## Why MergeReceipt

**Claims are not evidence.** Reproducible verification is useful.

A plausible pull request can still hide basic uncertainty: only part of the
test suite ran, the build was skipped, behavior changed without a test-file
change, or authentication, billing, migrations, CI, or lockfiles were touched.
MergeReceipt makes those signals explicit before a maintainer spends time
reconstructing them.

## Quick Start

MergeReceipt requires Node.js 20 or newer.

```bash
npm install --save-dev mergereceipt
npx mergereceipt init
npx mergereceipt verify
```

The npm package and installed binary are both `mergereceipt`, so npm resolves
the local executable without a package-to-binary alias.

For an explicit, version-pinned one-shot invocation:

```bash
npx --yes mergereceipt@0.1.0 verify
```

`init` detects useful `test`, `lint`, `typecheck`/`type-check`, and `build`
scripts in `package.json`. It creates `.mergereceipt.yml` and refuses to replace
an existing file unless `--force` is supplied.

## Example Report

Run the repository's reproducible three-state walkthrough:

```bash
npm run demo
```

The demo uses a temporary git repository and shows:

1. changed auth source with no test-file change → `REVIEW_REQUIRED`, 80;
2. a focused test added while auth still needs focused review →
   `REVIEW_REQUIRED`, 95;
3. a non-sensitive source change with its test and all checks passing →
   `PASS`, 100.

See [examples/README.md](examples/README.md) for the exact scenario.

## How It Works

MergeReceipt follows one direct pipeline:

```text
config → git diff + command checks → file signals → scoring + verdict
                                                   ├─ terminal
                                                   ├─ JSON
                                                   └─ GitHub Summary
```

- Commands record exit code, duration, bounded stdout/stderr summaries, timeout,
  and truncation state.
- Git compares against an explicit or discovered base and includes local staged,
  unstaged, and untracked files by default.
- File analysis reports a modest test-change heuristic and configurable
  sensitive-path matches.
- Scoring lists every fixed deduction. Verdict rules are independent and
  decisive.

## GitHub Actions

Use `pull_request`, read-only permissions, full history, and no persisted
checkout credential. The Action writes to the job summary and does not need API
write access.

```yaml
name: MergeReceipt

on:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: rfedosov/mergereceipt@v0.1.0
```

The Action reference above becomes valid only after the immutable `v0.1.0`
release exists. Before stable 1.0, use an exact release tag. `@v1` will be
introduced only with a real `v1.0.0` release; it must never point at unreleased
code.

| Input | Default | Purpose |
| --- | --- | --- |
| `config` | `.mergereceipt.yml` | Config path inside the workspace |
| `base` | automatic | Explicit git base revision |
| `working-directory` | `.` | Repository subdirectory; cannot escape the workspace |
| `fail-on-review` | `false` | Return exit 3 for `REVIEW_REQUIRED` |

The Action uses the same bundled production core as the CLI. This repository's
CI dogfoods that Action after rebuilding and verifying its committed bundle.

## Configuration

```yaml
version: 1

checks:
  tests:
    command: npm test
    required: true
    timeoutMs: 600000
  lint: npm run lint
  typecheck:
    command: npm run typecheck
    required: false
  build:
    command: npm run build
    required: true

analysis:
  requireTestsForChangedCode: true
  testPatterns:
    - "**/*.test.*"
    - "**/*.spec.*"
    - "tests/**"
    - "**/__tests__/**"
  sourcePatterns:
    - "**/*.{js,jsx,ts,tsx,mjs,cjs,py,rb,go,rs,java}"
  sensitivePatterns:
    - "**/auth/**"
    - "**/security/**"
    - "**/payments/**"
    - "**/migrations/**"
    - ".github/workflows/**"
    - "package-lock.json"

git:
  # Optional; CLI --base takes precedence.
  base: main
  includeUncommitted: true
```

Short-form checks are required and use a ten-minute timeout. Check names accept
letters, numbers, `_`, and `-`. Configuration is strict: duplicate YAML keys,
unknown keys, unsafe types, excessive aliases, and files over 1 MiB fail as
runtime/configuration errors. A config may define at most 50 command checks;
use a job-level timeout as the outer resource limit for untrusted repositories.

Base selection prefers `--base`, config, the GitHub PR base SHA, the GitHub base
branch, common upstream branches, and then a local previous commit. In GitHub
PR context, an unavailable advertised base fails closed instead of reporting an
empty diff. Git arguments are passed without a shell.

The test-change signal says only that source changed and no changed path matched
a test pattern. It does not prove that tests are missing or inadequate.
Sensitive matches similarly request focused review; they are not vulnerability
findings.

## Evidence & Scoring

Every evidence item records a stable ID, category, status, description,
required/deterministic flags, and optional duration, details, and structured
data. Reports include the entire deduction list.

Scoring starts at 100:

| Signal | Deduction |
| --- | ---: |
| Failed required check | −40 each |
| Skipped required check | −25 each |
| Failed optional check | −15 each |
| Source change without a test-file change | −15 |
| One or more sensitive files changed | −5 total |
| No command checks configured | −20 |
| Other advisory warning | −5 |

These are visible policy weights, not statistical estimates. They create coarse
separation between failed required evidence, missing verification signals, and
review advisories. A required failure always produces `FAIL` even if the
remaining numeric score is high.

**A high score does not mean a pull request is correct.** **Evidence Score is not a probability that the code is correct.** It is only a compact summary of the
verification signals MergeReceipt collected. Read the verdict, deductions, and
evidence—not the number alone.

- `FAIL`: required evidence failed or was skipped.
- `REVIEW_REQUIRED`: required evidence did not fail, but a warning or optional
  failure remains.
- `PASS`: collected evidence contains no failure or warning.

## Exit Codes

| Code | Meaning |
| ---: | --- |
| `0` | `PASS`, or advisory `REVIEW_REQUIRED` under the default policy |
| `1` | Verification completed with `FAIL` |
| `2` | Config, git, input, or runtime error prevented a valid report |
| `3` | `REVIEW_REQUIRED` with `--fail-on-review` / `fail-on-review: true` |

Code 0 does not always mean the verdict is `PASS`; inspect the report or enable
strict review handling when CI must block on warnings.

## JSON Output

```bash
npx mergereceipt verify --json > mergereceipt-report.json
```

Stdout contains one JSON document; diagnostics use stderr. The contract is
versioned with `schemaVersion: 1` and validated in tests against
[schemas/report.schema.json](schemas/report.schema.json). Timestamps and command
durations are run metadata and naturally vary; evidence decisions, deductions,
and verdicts are deterministic for the same repository, config, and command
results.

See [docs/json-output.md](docs/json-output.md) for compatibility rules.

## Security Model

`.mergereceipt.yml` is executable repository input. Configured commands run in a
system shell with the current process permissions and environment. A fork PR
can therefore execute arbitrary code in its MergeReceipt job.

- Use `pull_request`; the bundled Action refuses `pull_request_target`.
- Never provide secrets, deployment credentials, signing keys, or production
  access to a job that checks out untrusted PR code.
- Keep `permissions: contents: read` and `persist-credentials: false`.
- A check that prints a secret can place it in the bounded report summary;
  MergeReceipt cannot reliably redact unknown credentials.
- File names and revisions are never interpolated into shell commands. Only the
  explicit command strings in config cross the shell boundary.
- Workspace/config real paths are checked to prevent traversal through Action
  inputs or symlinks. Captured output is bounded and rendered defensively.

Read [SECURITY.md](SECURITY.md) before running on external contributions.
MergeReceipt reduces uncertainty; it does not make untrusted code safe to run.

## AI Agents

**Deterministic checks first. Semantic judgment second. Human decision last.**

MergeReceipt currently has no LLM evaluation command. The exported provider-neutral
interface reserves a future advisory layer that may compare a task, PR claims,
diff, and deterministic report. Such evidence will never replace a build, test,
lint, or typecheck result. See [docs/semantic-providers.md](docs/semantic-providers.md).

## Roadmap

- PR comment reporting with explicit minimal permissions
- optional provider-neutral semantic claim verification
- richer monorepo source-to-test relationships
- structured test/coverage format adapters
- additional CI integrations and policy presets

These are roadmap items, not current capabilities.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and
[ARCHITECTURE.md](ARCHITECTURE.md). The standard contributor path is:

```bash
npm ci
npm test
npm run build
```

Security issues belong in GitHub private vulnerability reporting, not a public
issue. Contributions follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © MergeReceipt contributors.
