# MergeReceipt architecture

MergeReceipt is intentionally a library-shaped CLI. Integrations call the same
verification core instead of reimplementing policy.

## Modules

- `src/cli.ts` — Commander commands, output selection, and exit policy.
- `src/config/` — strict YAML validation, defaults, discovery, and safe `init`.
- `src/checks/` — bounded shell-command execution and command evidence.
- `src/git/` — shell-free git process calls and changed-file discovery.
- `src/analysis/` — test-change and sensitive-file signals.
- `src/scoring/` — fixed deductions and verdict rules.
- `src/core/verify.ts` — orchestration; returns a `VerificationReport`.
- `src/reporters/` — pure terminal, JSON, and Markdown renderers.
- `src/github/action.ts` — GitHub environment, summary, and outputs.
- `src/providers/` — provider-neutral contract for future advisory semantics.

## Dependency direction

Reporters and integrations depend on the core model. The core does not import a
reporter, Commander, or a GitHub SDK. Deterministic collectors do not depend on
semantic providers.

## Adding evidence

Prefer a small collector that returns one stable `Evidence` item. The item must:

1. use a stable, namespaced ID;
2. explain exactly what was observed;
3. distinguish `failed`, `warning`, and `skipped` honestly;
4. carry structured values in `data` when integrations may need them;
5. have tests that exercise behavior, failure, and adversarial input.

Any new deduction must be fixed, documented, and represented in
`scoreBreakdown`. Scores cannot depend on randomness or unrecorded AI output.

## Process boundaries

Configured checks are shell strings by design, because package scripts commonly
need redirection, pipelines, and environment expansion. That boundary is trusted
repository code. Output is drained continuously, retained as a bounded tail,
and summarized after terminal control characters are removed.

Git is different: every invocation uses an executable plus an argument array.
Revisions are validated and resolved to commit SHAs before diffing. File names
are returned using NUL delimiters, which preserves whitespace and newlines and
prevents them from becoming command syntax.

## GitHub Action distribution

TypeScript compiles to `dist/`; `@vercel/ncc` then produces the dependency-free
Action bundle at `dist/action/index.js`. Published tags must include generated
`dist` files. CI rebuilds and checks that `dist` has no diff.

## Compatibility policy

The MVP supports Node.js 20+. Configuration and JSON report formats are each
versioned. Report schema version 1 is closed at defined object boundaries:
unknown top-level fields are rejected. Existing fields may gain documentation
clarifications, while adding/removing closed fields outside `evidence[].data`
or changing their meaning requires a schema-version change. Namespaced values
may evolve inside evidence `data` objects without making prose descriptions an
integration contract.
