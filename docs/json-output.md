# JSON output contract

`mergereceipt verify --json` writes one JSON document followed by a newline to
stdout. Configuration/runtime diagnostics use stderr, so consumers can parse
stdout without removing banners or progress output.

The authoritative contract is
[`schemas/report.schema.json`](../schemas/report.schema.json). CI validates JSON
from the real CLI path against that Draft 2020-12 schema.

## Versioning

- Consumers must branch on `schemaVersion`; it is currently `1`.
- Schema version 1 rejects unknown top-level and defined-object fields.
- Adding or removing a closed contract field outside `evidence[].data`, changing
  required/optional semantics, or changing a field's meaning requires a new
  schema version.
- Evidence IDs and structured `data` are integration surfaces. Formatted names,
  descriptions, terminal output, and Markdown are human-facing prose.
- Consumers should ignore unfamiliar evidence IDs and unfamiliar keys inside an
  evidence item's open `data` object. New `data` keys may appear within schema
  version 1; that object is the explicit extension point.

## Fields

- `schemaVersion` — report contract version.
- `tool` — generator name and MergeReceipt version.
- `generatedAt` — UTC ISO 8601 generation time.
- `repository` — selected base, current head SHA, and sorted changed paths.
- `evidence` — ordered structured command/repository/analysis results.
- `score` — integer summary from 0 to 100.
- `scoreBreakdown` — starting value, every deduction, and final value.
- `verdict` — `PASS`, `REVIEW_REQUIRED`, or `FAIL`.

`generatedAt` and command `durationMs` values naturally vary between runs.
Command output can also contain nondeterministic tool text. Given the same git
state, config, and command results, evidence classification, deductions, score,
and verdict are deterministic.

**Evidence Score is not a probability that the code is correct.** Integrations
should use `verdict`, evidence statuses/IDs, and deductions for policy decisions.

## Example

```json
{
  "schemaVersion": 1,
  "tool": { "name": "mergereceipt", "version": "0.1.0" },
  "generatedAt": "2026-08-10T00:00:00.000Z",
  "repository": {
    "base": "main",
    "head": "0123456789abcdef0123456789abcdef01234567",
    "changedFiles": ["src/session.ts"]
  },
  "evidence": [
    {
      "id": "check.tests",
      "name": "Tests",
      "category": "command",
      "status": "passed",
      "description": "Command exited successfully.",
      "required": true,
      "deterministic": true,
      "durationMs": 2410,
      "data": {
        "command": "npm test",
        "exitCode": 0,
        "signal": null,
        "timedOut": false,
        "stdoutSummary": "147 passed",
        "stderrSummary": "",
        "stdoutTruncated": false,
        "stderrTruncated": false
      }
    }
  ],
  "score": 100,
  "scoreBreakdown": {
    "initial": 100,
    "deductions": [],
    "final": 100
  },
  "verdict": "PASS"
}
```
