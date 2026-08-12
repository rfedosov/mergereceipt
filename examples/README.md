# MergeReceipt reproducible scenarios

Run the reproducible demo from the repository root:

```bash
npm ci
npm run demo
```

The script creates a new repository under the operating system's temporary
directory, runs the built production CLI, and removes the repository when it
finishes. It never changes the MergeReceipt working tree.

The walkthrough contains three independent states:

1. A non-sensitive source change includes its matching test and all configured
   commands pass: `PASS`, score 100.
2. A non-sensitive source file changes without a changed test file. Commands
   still pass, but MergeReceipt emits the test-change review signal:
   `REVIEW_REQUIRED`, score 85.
3. Authentication source and its focused test change together. The test-change
   signal passes, while the sensitive-area signal remains:
   `REVIEW_REQUIRED`, score 95.

Each branch starts from the same baseline. This keeps the two warnings separate:
a test-file change does not waive focused review for a configured sensitive
area, and a sensitive match is not required to demonstrate the missing-test
signal.

The script asserts the expected score and verdict for every state. It invokes
the built `dist/cli.js`, not a separate demo implementation.

To regenerate the README terminal asset from the clean scenario:

```bash
npm run demo:asset
```

Elapsed times in the SVG come from that real run and can vary when regenerated.
