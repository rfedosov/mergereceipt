# MergeReceipt launch walkthrough

Run the reproducible demo from the repository root:

```bash
npm ci
npm run demo
```

The script creates a new repository under the operating system's temporary
directory, runs the built production CLI, and removes the repository when it
finishes. It never changes the MergeReceipt working tree.

The walkthrough contains three honest states:

1. Authentication source changes while the existing tests still pass but no
   test file changes. MergeReceipt reports both the test-change and sensitive-file
   signals: `REVIEW_REQUIRED`, score 80.
2. A focused authentication test is added. The test-change signal passes, but
   the sensitive authentication signal deliberately remains:
   `REVIEW_REQUIRED`, score 95.
3. An independent non-sensitive source change includes its test and all command
   checks pass: `PASS`, score 100.

This separation matters. Adding a test is evidence, but it does not silently
waive focused review for a configured sensitive area.
