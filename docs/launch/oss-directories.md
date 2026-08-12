# OSS directories and awesome lists

Checked on 2026-08-12. Submit nothing automatically; re-check the target's
rules and recent maintainer activity immediately before proposing an entry.

## Shortlist

### 1. GitHub Marketplace for Actions

- URL: [official publishing guide](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace)
- Relevance: highest. MergeReceipt is already a public JavaScript Action with a
  root `action.yml` and an immutable release tag.
- Rules: the Action name must be unique; the owner must accept the Marketplace
  Developer Agreement; publication is selected while creating a release and
  requires 2FA.
- Recommended timing: a future explicitly authorized release. Do not modify the
  immutable `v0.1.0` release merely to add a Marketplace listing.

### 2. awesome-actions

- URL: [repository](https://github.com/sdras/awesome-actions) and
  [contribution rules](https://github.com/sdras/awesome-actions/blob/main/contributing.md)
- Relevance: direct match for the GitHub Action distribution.
- Rules: one suggestion per pull request, add it to the relevant category, keep
  the description short, use the requested link format, and include the
  repository URL in the commit body.
- Recommended timing: after the onboarding pull request is merged and at least
  one external repository has exercised the Action. Check maintainer activity
  first; the repository was not archived, but its latest push observed during
  this review was 2024-09-01.

### 3. awesome-code-review

- URL: [repository](https://github.com/joho/awesome-code-review) and
  [contribution rules](https://github.com/joho/awesome-code-review/blob/main/contributing.md)
- Relevance: MergeReceipt supports pull request review preparation without
  claiming automated correctness.
- Rules: entries are alphabetized, use one link, and require a concise,
  non-promotional description. A new category requires at least three items.
- Recommended timing: after real-user feedback confirms that the report reduces
  review preparation time. Verify that submissions are actively maintained;
  the latest push observed during this review was 2024-09-09.

### 4. awesome-cli-apps

- URL: [repository](https://github.com/agarrharr/awesome-cli-apps) and
  [contribution rules](https://github.com/agarrharr/awesome-cli-apps/blob/master/contributing.md)
- Relevance: the local CLI is useful independently of GitHub Actions.
- Rules: the app must be open source, easy to install, well documented, more
  than three months old, and have more than 20 GitHub stars. One human-authored
  pull request per app is required.
- Recommended timing: not eligible yet. Reconsider only when both age and star
  criteria are honestly met.

## Explicitly excluded

- [sourcegraph/awesome-code-ai](https://github.com/sourcegraph/awesome-code-ai)
  is archived.
- [awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools)
  requires each listed tool to use AI. MergeReceipt deliberately does not, so a
  submission would be misleading.
- General AI-agent or model directories are not a fit: MergeReceipt is
  provider-neutral verification infrastructure, not an agent or model.
