# Reddit launch drafts

Check each community's current self-promotion and link-post rules immediately
before posting. Use one relevant community at a time and answer technical
questions; do not cross-post identical copy broadly.

## Developer / programming communities

### Title

I built an open-source CLI that turns PR verification into a reproducible report

### Body

When a pull request says “tests pass,” I still want to know which checks ran,
what changed, and which review signals remain. I built MergeReceipt to collect
that evidence locally or in GitHub Actions.

It runs configured test/lint/typecheck/build commands, analyzes changed files,
flags source changes without a matching test-file change, flags configured
sensitive paths, and reports explicit deductions with a PASS,
REVIEW_REQUIRED, or FAIL verdict. JSON output is available for integrations.

It does not guarantee correctness or replace review. The score is not a
probability. There is no hosted service, account, AI dependency, or telemetry.

I am looking for feedback from maintainers on first-run friction and useful
deterministic signals: https://github.com/rfedosov/mergereceipt

## AI coding communities

### Title

Agent says it works; this CLI collects the evidence before review

### Body

I use coding agents, but “tests pass” in an agent summary is still only a claim.
MergeReceipt is a provider-neutral open-source CLI and GitHub Action that reruns
repository checks and adds pull-request-aware signals before a human reviews
the change.

The current version has no LLM step. That is intentional: deterministic checks
first, optional semantic judgment later, human decision last.

The three-scenario demo and security model are in the README:
https://github.com/rfedosov/mergereceipt
