# MergeReceipt v0.1.0 release audit

Audit date: 2026-08-10
Scope: npm package, CLI, GitHub Action, CI, release process, documentation,
dependencies, trust boundaries, repository hygiene, and public-launch UX.

## Executive result

**NOT READY for public publication yet.** The local release candidate has no
known unresolved code-level blocker or high-priority defect. Canonical identity
is configured as `rfedosov/mergereceipt`. Publication remains intentionally
blocked until the repository exists, `mergereceipt` is claimed by the intended
npm owner, and the hosted GitHub Actions matrix is green. See
[RELEASE_CONFIG.md](RELEASE_CONFIG.md) for the fixed metadata.

The audit was written before remediation and then updated in place with the
verified result of each finding.

## Brand and namespace audit

This is a practical discoverability and namespace check performed on
2026-08-10, not legal trademark clearance. Registry `404` responses mean only
that no package was published at the exact name when checked; they do not
reserve a name.

| Name | Why it fits | GitHub status | npm status | Search collisions | Confusion risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| PRSignal | Short and directly describes PR verification signals. | Exact public repo [`SUDARSHANCHAUDHARI/PRSignal`](https://github.com/SUDARSHANCHAUDHARI/PRSignal); exact account absent. | `prsignal` and `prsignal-cli` unpublished. | Active public-relations brands use PR Signal, including [`prsignal.co.uk`](https://prsignal.co.uk/); the phrase also appears in developer workflow language. | **HIGH** | Reject. The exact dev repo and active companies are significant conflicts. |
| MergeEvidence | Directly describes evidence used around merge decisions. | No exact repo or account found. | Unpublished. | `MergeEvidence` is already a type/API term in [`burn_p2p_security`](https://docs.rs/burn_p2p_security/latest/burn_p2p_security/) and cloud libraries. | **MEDIUM** | Reserve only; too generic in technical search. |
| DiffSignal | Connects changed code with verification signals. | No exact repo; a close `compare_diffsignal` repo exists. | **Occupied** by an unrelated `diffsignal@1.0.0` package. | Established scientific, signal-processing, and PCB term. | **HIGH** | Reject. npm is unavailable and search intent is noisy. |
| MergeReceipt | A receipt is a reproducible record of checks collected before merge. | No exact repo or account; one longer [`MergeReceiptForTaxes`](https://github.com/robarm74/MergeReceiptForTaxes) repo exists. | Unpublished. | Only generic receipt/PDF merge operations and a [`MergeReceiptSvc`](https://journey.temenos.com/docs/javadoc/2410/fluent-api/com/avoka/tm/svc/MergeReceiptSvc.html) API surfaced; no exact devtool brand. | **LOW** | **Recommended.** Cleanest relevant package/repository namespace and readable product metaphor. |
| DiffWitness | A witness can record what a diff actually demonstrates. | No exact repo or account found. | Unpublished. | “diff witness” is an established semantic-differencing research term. | **MEDIUM** | Reject for search ambiguity. |
| ReviewTrace | Conveys an audit trail for review. | Multiple exact [`ReviewTrace`](https://github.com/flight1697/ReviewTrace) repos exist, including an AI build-week project. | Unpublished. | Exact software/code examples already use the name. | **HIGH** | Reject. |
| MergeLedger | Suggests an auditable record before merge. | No exact repo or account found. | Unpublished. | An ecommerce profit-dashboard product uses Mergeledger; strong finance/accounting meaning. | **MEDIUM** | Reject for product-category confusion. |
| DiffBeacon | Suggests a visible signal emitted by a diff. | Exact public [`andrespistoni/diffbeacon`](https://github.com/andrespistoni/diffbeacon) repo exists. | Unpublished. | Exact GitHub collision dominates an otherwise sparse search. | **HIGH** | Reject. |
| PRReceipt | Compact PR-specific evidence metaphor. | No exact repo or account found. | Unpublished. | No exact devtool/product surfaced; `PR receipt` is also read as purchasing/public-relations language. | **LOW** | Runner-up; namespace is clean, but the name is less natural to read aloud. |
| ChangeWitness | Describes a record that witnesses a code change. | No exact repo or account found. | Unpublished. | No exact software brand surfaced, but `changewitness.com` is registered and resolves. | **MEDIUM** | Third choice; weaker PR/merge association and domain collision. |

Exact PyPI and crates.io API checks returned `404` for all ten unhyphenated
candidate names. For the top choice, `mergereceipt.com`, `mergereceipt.dev`,
and `mergereceipt.io` had no registry record or DNS address when checked. The
top three were MergeReceipt, PRReceipt, and ChangeWitness, in that order.

## BLOCKER

| ID | Final status | Finding | Resolution or remaining action |
| --- | --- | --- | --- |
| B-01 | **RESOLVED LOCALLY** | Canonical GitHub owner and URLs were previously unknown. | Owner is `rfedosov`; package metadata and README now point to `rfedosov/mergereceipt`. The hosted repository itself has intentionally not been created. |
| B-02 | **OPEN — owner action required** | `mergereceipt` returned npm `E404` on 2026-08-10, so the exact package appeared unpublished but was not reserved. | Claim `mergereceipt` through the documented one-time first-package bootstrap with 2FA, then configure trusted publishing and disallow long-lived publishing tokens. |
| B-03 | **RESOLVED LOCALLY** | There was no guarded tag release, immutable artifact, checksum, provenance path, or version gate. | Added a SHA-pinned `v*.*.*` workflow, exact tag/package/source checks, full verification, committed-bundle diff checks, one packed tarball, SHA-256/SRI metadata, npm OIDC publish, and GitHub release assets. The workflow can be exercised only after the repository exists. |
| B-04 | **RESOLVED LOCALLY** | Documentation advertised a nonexistent moving `v1` Action tag and scattered an unresolved owner value. | Documentation uses only the immutable `rfedosov/mergereceipt@v0.1.0` release. The release guide reserves moving `v1` for the real `v1.0.0` release and never treats it as immutable. |
| B-05 | **OPEN — hosted verification required** | Windows, macOS, fork-PR permissions, CodeQL upload, and release-environment behavior cannot be proven on this Linux workspace without a real GitHub repository. | After creating `rfedosov/mergereceipt`, push a review branch and require a green CI/CodeQL run, including the entire OS/Node matrix and a real fork PR, before creating `v0.1.0`. |

## HIGH

| ID | Final status | Finding | Verified remediation |
| --- | --- | --- | --- |
| H-01 | **IMPLEMENTED; hosted run pending** | CI covered only Ubuntu/Node 20. | CI now covers Ubuntu, Windows, and macOS on Node 20 and 22 without duplicating the heavy Ubuntu/20 quality job. Node 22 matrix jobs run packed-install E2E. Workflow structure and SHA pins are tested; B-05 remains the remote acceptance gate. |
| H-02 | **RESOLVED** | Build cleanup and E2E commands had POSIX-only path/glob assumptions. | Cleanup uses `node:path` containment, fixture commands avoid shell glob expansion, nested npm configuration is scrubbed, local `npx` is exercised offline with current syntax, and symlink/junction tests are platform-aware. |
| H-03 | **RESOLVED** | Git behavior lacked realistic PR and shallow-clone coverage. | Real temporary repositories/remotes now cover normal PR, fork-like PR metadata, shallow detached checkout, exact-SHA fetch, missing base SHA, invalid/unavailable base, no upstream, no-test change, sensitive change, and unusual paths. |
| H-04 | **RESOLVED** | An unavailable GitHub PR base could fall back to `HEAD` and report an empty change set. | GitHub PR context now fails closed if its advertised base cannot be resolved or fetched. Local non-PR fallback remains conservative and documented. |
| H-05 | **RESOLVED** | The npm archive exposed source, maps, tests/internal documents, and the Action bundle. | A strict allowlist now packages only the CLI/library runtime, public types, JSON contract, README, license, changelog, and security policy. The GitHub Action bundle remains in the repository tag where Action consumers need it, not in the npm CLI archive. |
| H-06 | **RESOLVED** | Actual `--json` output was not validated against the public schema, and v1 compatibility text contradicted the closed schema. | Unit and packed-install E2E validate real reports with Ajv. `schemaVersion: 1` is strict; structural additions/removals require a schema-version change. Runtime timestamps/durations are documented as variable metadata. |
| H-07 | **RESOLVED** | Workflows used mutable external Action tags and persisted checkout credentials. | Every external Action is pinned to a verified full commit SHA; checkout credentials are disabled; default permissions are read-only; Dependabot monitors workflow and npm dependencies. |
| H-08 | **RESOLVED LOCALLY** | No guard tied source, bundled Action, tag, and published tarball together. | `release:check` ties tag/package/source/repository metadata together. CI/release rebuild and require a clean `dist` diff. Two local builds produced identical Action SHA-256. The release publishes the exact inspected tarball and records checksums/SRI. |
| H-09 | **RESOLVED** | Clean-room package behavior and a reusable demonstration were absent. | E2E creates a fresh npm project and git repository, installs the tarball, exercises `init`, terminal/JSON verification, exit policies, schema validation, public exports, package exclusions, and the bundled Action. A safe three-state demo uses and removes its own temporary repository. |

## MEDIUM

| ID | Final status | Finding | Verified remediation |
| --- | --- | --- | --- |
| M-01 | **RESOLVED** | First-visit README UX, npm/binary naming, demo, and score limitations were unclear. | README now leads with value, install, report, and limitations; package and binary are both `mergereceipt`; it says a high score does not mean a pull request is correct. |
| M-02 | **RESOLVED** | Hostile changed-file names could confuse Markdown rendering. | Filenames use HTML-escaped `<code>` output, terminal controls are removed, and tests include backticks, HTML, and newlines. |
| M-03 | **RESOLVED** | Changelog and release/tag operation were ambiguous. | `CHANGELOG.md` has one factual `0.1.0` entry. `docs/releasing.md` documents bootstrap, OIDC, immutable semantic tags, and the later moving major tag. |
| M-04 | **RESOLVED** | Contributor/tooling hygiene was incomplete. | Added `.editorconfig`, `.nvmrc`, `.gitattributes`, expanded `.gitignore`, lockfile enforcement, and Dependabot. |
| M-05 | **RESOLVED** | Contributor setup and review expectations were incomplete. | CONTRIBUTING now gives setup, architecture map, quality/package/E2E commands, cross-platform expectations, PR evidence requirements, and private security reporting. |
| M-06 | **RESOLVED LOCALLY** | CodeQL was absent. | Added a minimal SHA-pinned JavaScript/TypeScript CodeQL workflow with scoped permissions. Hosted execution is part of B-05. |
| M-07 | **RESOLVED** | No performance/package baseline existed. | Recorded CLI startup, small real-repository verification, npm archive, and Action bundle sizes below. These are engineering baselines, not marketing benchmarks. |

## LOW

| ID | Final status | Finding | Verified remediation |
| --- | --- | --- | --- |
| L-01 | **RESOLVED** | `GITHUB_EVENT_PATH` was read before its size was known. | The file is now statted and rejected above 1 MiB before it is read. |
| L-02 | **RESOLVED** | npm discovery keywords were sparse. | Metadata uses the focused `ai`, `agent`, `codex`, `claude`, `github-actions`, `pull-request`, `ci`, `verification`, `code-review`, and `developer-tools` set. |
| L-03 | **RESOLVED** | Release metadata validation was not centralized. | Tests keep package/source versions aligned; `release:check` also validates semantic tag, public package policy, Node engine, binary, license, repository URLs, and release-marker removal. |

## Security review

MergeReceipt intentionally executes repository-configured shell commands. On an
untrusted fork PR, the checkout and `.mergereceipt.yml` are arbitrary code. The
safe baseline is `pull_request`, no secrets, `contents: read`, no persisted
checkout credential, an ephemeral runner, and no privileged downstream job
that trusts attacker-produced caches, artifacts, or output.

The bundled Action refuses `pull_request_target`. Action input paths are
relative and checked by real path against `GITHUB_WORKSPACE`; default and
explicit config symlinks plus working-directory junction escapes are rejected.
Git uses argument arrays with `shell: false`, validates revisions, resolves
commits, disables credential
prompts, bounds runtime/output, and parses NUL-delimited paths. Branch names and
filenames are never interpolated into command strings. Report output is bounded
and escaped. These controls do not sandbox configured checks or prevent those
checks from printing secrets; the documentation states that boundary directly.

## Production dependency review

The production graph has four direct dependencies and zero transitive runtime
dependencies in the installed tree:

| Dependency | Purpose | Assessment | Decision |
| --- | --- | --- | --- |
| `commander` 14.0.3 | CLI parsing/help/errors | Maintained, zero runtime dependencies, Node 20-compatible. | Keep; do not take the available 15.x major during hardening. |
| `picomatch` 4.0.5 | Cross-platform configurable glob matching | Small, maintained, zero runtime dependencies; safer than platform shell globs. | Keep. |
| `yaml` 2.9.0 | Strict YAML loading/writing | Maintained, zero runtime dependencies, required by the public config format. | Keep. |
| `zod` 4.4.3 | Strict runtime config validation and typed defaults | Maintained and zero-dependency, but the largest direct runtime package. Bespoke replacement would add validation risk immediately before release. | Keep for 0.1.0; reassess only with measured pressure. |

Ajv and Ajv Formats are development-only dependencies used to test the public
JSON Schema. `npm audit` reported zero vulnerabilities. `npm outdated` showed
only available major versions for selected CLI/development tools; no installed
package was behind its declared compatible range, so no release-hardening major
upgrade was taken.

## Package contents and reproducibility

Final `npm pack --dry-run --json` result:

- name/version: `mergereceipt@0.1.0`;
- 47 files;
- 26,960 bytes packed;
- 95,303 bytes unpacked;
- no TypeScript source, tests, fixtures, coverage, maps, local config, release
  documents/scripts, or GitHub Action bundle;
- required CLI JS/types, public library JS/types, JSON documentation/schema,
  README, LICENSE, CHANGELOG, SECURITY, and package metadata only.

The package allowlist fails above 60 files, 150 KiB packed, or 500 KiB
unpacked. The bundled Action is 564,546 bytes. Two independent final builds
produced SHA-256
`57c732724265fa2b36756aebe4be7080c7b8e33888bb1cf90e517a511889a492`.

## Performance baseline

Measured on Linux/Node.js 22.23.1 with the provided reproducible baseline
script:

- CLI startup, 25 processes: 135.5 ms minimum, 153.4 ms median, 173.8 ms p95,
  153.8 ms mean;
- small real-git repository verification, 7 processes: 196.6 ms minimum,
  210.5 ms median, 235.0 ms p95, 211.9 ms mean;
- npm archive: 26,960 bytes packed / 95,303 bytes unpacked;
- bundled Action: 564,546 bytes.

## Final verification evidence

- Clean `npm ci --ignore-scripts`: passed; 168 packages installed.
- `npm run release:configure -- rfedosov`: passed and remained idempotent;
  canonical metadata is `rfedosov/mergereceipt`.
- `npm audit --json`: zero known vulnerabilities across 217 reported
  production/development/optional records.
- `npm run lint`: passed.
- `npm run typecheck`: passed under strict TypeScript.
- `npm test`: 57/57 tests passed across 15 files on Node.js 22.23.1.
- The same 57/57 test suite passed on Node.js 20.20.2.
- `npm run build`: passed; Action bundle generated.
- `npm run package:check`: passed with the exact allowlist/size limits above.
- `npm run test:e2e`: packed-install clean-room flow passed on Node.js 22.23.1.
- The packed-install E2E also passed when driven by Node.js 20.20.2.
- `node dist/cli.js --help` and `--version`: passed; reported `0.1.0`.
- The packed-install E2E ran both the installed CLI and this workspace's
  `dist/cli.js verify --json` inside a real temporary git repository and
  validated both reports against the public JSON Schema.
- The literal command in this extracted workspace correctly returns exit 2
  because its `.git` directory is empty and not a repository; no git history
  was invented to hide that environment limitation.
- `npm run demo`: all three documented verdict/score states reproduced and its
  temporary repository was removed.
- Release artifact creation, checksum verification, tar inspection, and the
  unpublished-registry guard were exercised locally without publishing.
- `npm run release:check`: passed locally and with canonical GitHub tag
  environment values; a mismatched repository was rejected.
- A fresh temporary Git repository staged 129 intended files and passed
  `git diff --cached --check`; ignored development and secret-bearing paths
  were not staged.
- No live GitHub workflow, fork PR, tag, release, or npm publication was run.

## Supply-chain references

The release design follows current official guidance for
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[secure GitHub Actions use](https://docs.github.com/en/actions/reference/security/secure-use),
and
[immutable Action releases and moving major tags](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/using-immutable-releases-and-tags-to-manage-your-actions-releases).

## Release-readiness conclusion

**NOT READY until B-02 and B-05 are complete.** Once the npm name is claimed and
the hosted CI/CodeQL/fork-PR acceptance run is green, the reviewed commit is
ready for the documented `v0.1.0` publication flow. No major feature work is
required for that release.
