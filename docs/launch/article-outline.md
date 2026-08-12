# Article outline

## Title

I stopped trusting “tests pass” from coding agents

## Opening

A coding agent can implement a feature, summarize the diff, and confidently say
that the tests pass. That sentence is useful context, but it is not evidence.
Before reviewing the code, I still need to know which commands actually ran,
whether the build passed, what files changed, and which verification gaps remain.

That distinction led to MergeReceipt: a small open-source CLI and GitHub Action
that collects reproducible pull request signals before review or merge.

## Outline

1. **The problem** — agent summaries are inexpensive to produce; maintainers
   still reconstruct verification state.
2. **A concrete pull request** — passing tests, changed source, no changed test
   file, and an authentication path touched.
3. **Why claims are not evidence** — distinguish reported intent from observed
   command and git results.
4. **What MergeReceipt collects** — command results, changed files, test-change
   heuristic, sensitive paths, deductions, verdict, JSON, and Step Summary.
5. **Architecture** — deterministic collectors, policy scoring, reporters;
   optional semantic providers remain outside the core decision path.
6. **What it cannot tell you** — no proof of correctness, coverage guarantee,
   vulnerability detection, or replacement for human review.
7. **Try it** — three npm commands and the minimal GitHub Action workflow.
8. **Feedback wanted** — real repository edge cases and signals that reduce
   maintainer reconstruction work.
