# Changelog

All notable MergeReceipt changes are documented here. Public releases follow
Semantic Versioning.

## 0.1.0

### Added

- `mergereceipt init` with package-manager and Node script detection.
- `mergereceipt verify` with terminal and stable schema-versioned JSON reports.
- Required and optional command checks with timeouts, bounded output, exit code,
  signal, duration, and truncation evidence.
- Local, normal-PR, fork-PR, shallow-clone, and detached-HEAD changed-file
  discovery with fail-closed GitHub base handling.
- Configurable test-change and sensitive-file review signals.
- Transparent deterministic deductions, three verdicts, and four documented
  process exit codes.
- Bundled Node 20 GitHub Action with job summary and `score`/`verdict` outputs.
- Cross-platform Node 20/22 CI, Action dogfooding, CodeQL, Dependabot, package
  allowlisting, and packed-install E2E.
- Tag-driven npm/GitHub release workflow prepared for npm trusted publishing and
  provenance after repository/account setup.
- MIT license, security policy, contributor guide, release audit, demo, and
  open-source repository templates.
