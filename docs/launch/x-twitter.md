# X / Twitter launch draft

## Primary post

AI coding agents can say the tests pass. MergeReceipt checks.

Open-source CLI + GitHub Action: run deterministic checks, inspect PR changes,
and produce a reproducible evidence report.

GitHub: https://github.com/rfedosov/mergereceipt
npm: https://www.npmjs.com/package/mergereceipt

## Optional follow-up

MergeReceipt does not claim a PR is correct. It records what ran, whether source
and test files changed, whether sensitive paths were touched, every score
deduction, and a PASS / REVIEW_REQUIRED / FAIL verdict.

No account, API key, hosted service, or telemetry.

## Asset

Attach `docs/assets/demo.svg` or a terminal recording made by running
`npm run demo`. Do not crop out deductions or the verdict.
