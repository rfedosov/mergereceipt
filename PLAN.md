# MergeReceipt MVP and v0.1.0 release-hardening plan

## Goal

Ship a production-quality Node.js 20+ CLI and JavaScript GitHub Action that
collect reproducible verification signals for a pull request or local change
set. The MVP must work without an AI provider.

## Architectural decisions

1. **TypeScript, CommonJS output, Node.js 20+.** CommonJS keeps the npm CLI and
   the bundled JavaScript Action compatible with the widest practical Node 20
   environments. Source remains strict TypeScript.
2. **Small dependency surface.** Commander handles CLI parsing, YAML parses the
   configuration, Zod validates it, and Picomatch evaluates configurable glob
   patterns. Everything else uses Node standard library APIs.
3. **Core is integration-independent.** `runVerification` returns a structured
   report. Terminal, JSON, Markdown, CLI, and GitHub Action layers only render or
   transport that report.
4. **Deterministic checks first.** Commands, git change detection, test-change
   signals, and sensitive-file signals are deterministic. A provider interface
   exists for future advisory semantic evidence, but no provider is required or
   treated as a replacement for checks.
5. **Explicit trust boundary.** Repository commands intentionally run through a
   system shell because users configure shell command strings. Git operations
   never use a shell, and branch names or file names are never interpolated into
   command strings.
6. **Transparent policy.** Scoring starts at 100 and every deduction appears in
   the report. Required failures decide `FAIL`; warnings and optional failures
   decide `REVIEW_REQUIRED`; only clean evidence decides `PASS`.
7. **Stable automation contract.** JSON uses a versioned schema. Exit codes are
   `0` for completed non-failing verification, `1` for `FAIL`, `2` for
   configuration/runtime errors, and `3` for `REVIEW_REQUIRED` when strict
   `--fail-on-review` policy is enabled.
8. **Action distribution is bundled.** The checked-in `dist/action/index.js`
   contains runtime dependencies, so a tagged GitHub Action needs no install
   step of its own.

## Milestones

- [x] Project tooling, configuration schema, and `init`
- [x] Safe command runner and git changed-file discovery
- [x] File analysis, evidence model, scoring, and verification orchestration
- [x] Terminal, JSON, Markdown, CLI, and GitHub Action entrypoints
- [x] Unit/integration tests and fixture repositories
- [x] Open-source documentation, policies, templates, and CI dogfooding
- [x] Clean-install and end-to-end self-review
- [x] Release/security/package/dependency audit and remediation
- [x] Cross-platform CI matrix and realistic Git/GitHub edge-case tests
- [x] Guarded npm/GitHub release workflow and immutable artifact checks
- [x] Configure canonical GitHub identity as `rfedosov/mergereceipt`
- [ ] Create the repository, claim the npm package, and run hosted acceptance

## Verification checkpoint

Verified on 2026-08-10:

- clean `npm ci` completed and `npm audit` reported zero vulnerabilities;
- lint, strict typecheck, 57 behavioral tests, and build passed on Node.js
  22.23.1;
- the same 57-test suite and packed CLI install passed on Node.js 20.20.2;
- packed-tarball installation, local `npx mergereceipt`, init, terminal/JSON
  verification, JSON Schema validation, strict exit policy, required failure,
  public exports, package exclusions, and bundled Action passed;
- two independent builds produced the same Action bundle SHA-256;
- the final package allowlist contains 47 files (26,960 bytes packed), and the
  bundled Action is 564,546 bytes;
- hosted Windows/macOS CI, CodeQL, fork-PR acceptance, and publication remain
  intentionally pending until `rfedosov/mergereceipt` exists and npm ownership
  is established.

## Out of scope

Dashboard, database, accounts, telemetry, SaaS services, mandatory AI, automatic
PR comments, and claims of semantic correctness.
