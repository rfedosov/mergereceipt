# Security policy

## Supported versions

Until 1.0, security fixes are applied to the latest published `0.x` release and
the default branch. After 1.0, this section will list supported release lines
explicitly.

## Reporting a vulnerability

Use GitHub private vulnerability reporting from the repository's **Security**
tab. Do not publish exploit details, credentials, private source, or affected
user data in an issue. If private reporting is unavailable, open a minimal
public issue requesting a private maintainer channel without including the
vulnerability.

Include the affected version, impact, reproduction conditions, and a proposed
fix when available. Maintainers will acknowledge a complete report as soon as
practical and coordinate disclosure after a fix is ready.

## Trust boundary

MergeReceipt intentionally executes command strings from `.mergereceipt.yml` using
the platform shell. Those commands run with MergeReceipt's user permissions,
environment, filesystem access, and network access. Repository scripts invoked
by those commands are executable input too.

MergeReceipt captures bounded command output and includes summaries in terminal,
JSON, and GitHub Summary reports. Do not put secrets in command strings. Ensure
checks do not print secrets: automatic redaction cannot reliably recognize
unknown credentials.

The following distinction is fundamental:

| Context | Repository trust | Safe baseline |
| --- | --- | --- |
| Local trusted repository | Chosen by the user | Run with only the permissions the checks need |
| Same-repository PR | Potentially untrusted | No secrets; read-only token; review workflow changes |
| Fork PR | Untrusted arbitrary code | `pull_request`, no secrets, read-only token, no persisted checkout credential |
| `pull_request_target` | Privileged base context | Do not check out or execute PR code; MergeReceipt's Action refuses this event |

## Recommended GitHub Actions posture

```yaml
on:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      # Continue with the pinned checkout and MergeReceipt steps below.

      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          fetch-depth: 0
          persist-credentials: false
      # Run the immutable MergeReceipt release tag here.
```

- Do not expose repository, deployment, signing, publishing, cloud, or
  production secrets to this job.
- Do not enable settings that send write tokens or secrets to fork PR
  workflows.
- Do not pass artifacts, caches, or output produced by an untrusted PR into a
  later privileged workflow without an explicit validation boundary.
- Pin external actions to reviewed full commit SHAs and keep them updated.
- Prefer GitHub-hosted ephemeral runners. A hostile check can persist on a
  self-hosted runner and attack later jobs.
- Resource limits still matter. Command output is bounded and checks have
  timeouts, but a malicious command can consume CPU, disk, memory, and network
  before termination.

## Input and filesystem handling

- Git commands use executable-plus-argument arrays with `shell: false`.
- Revisions reject option-like/control-character input and resolve to commits
  before diffing.
- Diff paths use NUL delimiters, so whitespace, newlines, and leading hyphens do
  not become command syntax.
- In GitHub PR context, an unavailable base fails closed instead of reporting
  an empty change set.
- Action working-directory and config paths are resolved with real paths and
  cannot escape `GITHUB_WORKSPACE`, including through symlinks.
- `mergereceipt init` refuses to overwrite a config symlink.
- Terminal control characters are removed from text output; Markdown and HTML
  report content is escaped.

These controls protect MergeReceipt's own argument and reporting boundaries. They
do not sandbox configured shell commands. Run MergeReceipt inside the same
isolation boundary you would use for the repository's test suite.
