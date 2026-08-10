# Releasing MergeReceipt

This is the maintainer runbook for npm package `mergereceipt` and GitHub
Action repository `rfedosov/mergereceipt`. Do not publish from an unreviewed
working tree.

## One-time repository setup

1. Confirm canonical metadata with
   `npm run release:configure -- rfedosov`.
2. Create the public GitHub repository `rfedosov/mergereceipt`.
3. Enable GitHub private vulnerability reporting, branch protection for `main`,
   tag protection for semantic release tags, and immutable releases.
4. Create a GitHub environment named `npm` with required maintainer approval.
5. Keep default workflow permissions read-only. The release job alone declares
   `contents: write` and `id-token: write`.
6. Run `npm run release:check` in a real clone with the expected tag/repository
   environment before attempting publication.

The release workflow uses a GitHub-hosted runner, Node 22, npm 12.0.2, no npm
registry token, and no setup-node `registry-url`. npm trusted publishing detects
OIDC directly and produces provenance for public packages from public GitHub
repositories.

## First-package bootstrap

npm trusted publishing is configured in an existing package's settings. For the
first `0.1.0` bootstrap only:

1. Verify the exact intended commit with all commands below.
2. Build and create the tarball with the same pinned npm CLI used by CI:
   `npx --yes npm@12.0.2 run release:artifact`.
3. Inspect `npm pack --dry-run` output and publish that exact tarball manually
   from the owning npm account with 2FA and public access. Do not store a token
   in the repository.
4. Configure trusted publishing for `mergereceipt` using the canonical GitHub
   repository, workflow file `release.yml`, environment `npm`, and
   `npm publish` permission.
5. Restrict npm publishing access to require 2FA and disallow tokens.
6. Create and push the exact `v0.1.0` tag. The workflow compares registry SRI
   integrity with its freshly packed tarball, skips a duplicate publish only
   when they are identical, and then creates the GitHub release.

With npm 12.0.2, trusted publishing may also be configured after bootstrap with:

```bash
npx --yes npm@12.0.2 trust github mergereceipt \
  --file release.yml \
  --repo rfedosov/mergereceipt \
  --env npm \
  --allow-publish
```

Confirm the exact repository and workflow in npm package settings; command
success is not a substitute for account review.
The manual first publish does not receive GitHub OIDC provenance. Subsequent
trusted publishes from the public GitHub repository do. This runbook never
claims provenance for the manual bootstrap.

## Release gate

```bash
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run build
npm run package:check
npm run test:e2e
node dist/cli.js --help
node dist/cli.js verify --json
```

Verify that rebuilding leaves `dist/` unchanged in git. Then create the signed
or annotated immutable release tag from reviewed `main` and push only that tag.
The workflow validates `v<package.version>`, rebuilds and tests, verifies the
committed Action bundle, packs once, records SHA-256/SRI metadata, publishes the
exact tarball, and creates a GitHub release with the tarball and checksums.

## GitHub Action tags

- During `0.x`, documentation points to exact immutable tags such as
  `v0.1.0`.
- At the first stable release, create immutable `v1.0.0` and then create a
  separate moving `v1` tag pointing to the same reviewed commit.
- For backwards-compatible 1.x releases, move only `v1`; never move
  `v1.0.0` or another semantic version tag.
- Do not attach a GitHub Release to the moving `v1` tag when immutable releases
  are enabled. Users who need maximum immutability can pin the semantic tag or
  full commit SHA.

The moving major tag is a convenience compatibility channel, not an immutable
artifact. It must be updated only after the corresponding immutable release is
green and published.
