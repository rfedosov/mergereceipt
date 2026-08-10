# Canonical release configuration

Canonical repository identity is configured:

```text
Owner: rfedosov
Repository: rfedosov/mergereceipt
npm package: mergereceipt
Binary: mergereceipt
Config: .mergereceipt.yml
```

Canonical URLs:

- repository: `git+https://github.com/rfedosov/mergereceipt.git`
- homepage: `https://github.com/rfedosov/mergereceipt#readme`
- issues: `https://github.com/rfedosov/mergereceipt/issues`
- immutable first Action release: `rfedosov/mergereceipt@v0.1.0`

The configuration is idempotently checked with:

```bash
npm run release:configure -- rfedosov
npm run release:check
```

The npm account used for the first publish is an operational permission, not a
repository configuration value. The `mergereceipt` package name appeared
unpublished during the 2026-08-10 registry check, but that check does not
reserve it. Claim it only through the documented release process with 2FA; no
long-lived npm token is required after trusted publishing is configured.
