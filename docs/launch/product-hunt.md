# Product Hunt assessment

## Recommendation

Defer a Product Hunt launch until MergeReceipt has feedback from several real
repositories and a short terminal recording. Hacker News, focused Reddit
communities, and maintainer networks are better first channels for a technical
CLI/GitHub Action because they can validate the problem and onboarding without
requiring broad launch-day activity.

Do not create a listing yet. Reassess after real users have tested the Action
and the project can answer common setup questions from evidence.

## Minimal future draft

**Tagline:** Reproducible verification signals before pull requests are merged

**Short description:** MergeReceipt is an open-source CLI and GitHub Action that
runs repository checks, analyzes pull request changes, and produces one explicit
evidence report for reviewers.

**Maker comment:** I built MergeReceipt because “tests pass” in a pull request
summary is a claim, not a record of what actually ran. The tool collects
deterministic command and git signals, shows every deduction, and leaves the
merge decision to a human. It does not guarantee correctness, call an AI model,
or send telemetry. I am looking for feedback on onboarding and real-world
repository edge cases.
