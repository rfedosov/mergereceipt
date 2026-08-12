# Hacker News launch draft

## Title

Show HN: MergeReceipt – Reproducible evidence for pull requests

## First comment

I built MergeReceipt after repeatedly seeing pull requests—especially large
ones produced by coding agents—arrive with claims such as “tests pass” or “the
build works,” while the reviewer still had to reconstruct what was actually
checked.

MergeReceipt is a small open-source Node.js CLI and GitHub Action. It runs the
commands declared by the repository, analyzes the real git change set, adds
simple test-change and sensitive-path signals, and emits the same structured
evidence report in the terminal, JSON, and GitHub Step Summary.

The architecture rule is: deterministic checks first, semantic judgment
second, human decision last. There is no LLM call in the current product, no
account, and no telemetry.

The limitations are deliberate. A changed test file does not prove adequate
coverage. A sensitive-path match is not a vulnerability finding. The score is
not the probability that code is correct. MergeReceipt only makes collected
signals and deductions explicit.

I would value feedback on the first-run experience, useful deterministic
signals, monorepo edge cases, and whether the report saves review time in real
repositories:

https://github.com/rfedosov/mergereceipt
