#!/usr/bin/env node

const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const projectRoot = resolve(__dirname, "..");
const packageJson = readJson(join(projectRoot, "package.json"));
const canonicalRepository = "rfedosov/mergereceipt";
const repository = process.env.GITHUB_REPOSITORY ?? canonicalRepository;
const tag = process.env.GITHUB_REF_NAME ?? `v${packageJson.version}`;

assert(packageJson.name === "mergereceipt", "package name is mergereceipt");
assert(
  typeof packageJson.version === "string" &&
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(packageJson.version),
  "package version is semantic"
);
assert(packageJson.private === false, "package is public");
assert(packageJson.license === "MIT", "package license is MIT");
assert(packageJson.bin?.mergereceipt === "dist/cli.js", "binary is mergereceipt");
assert(packageJson.engines?.node === ">=20", "Node engine is >=20");
assert(packageJson.publishConfig?.access === "public", "npm access is public");

assert(
  repository === canonicalRepository,
  `GITHUB_REPOSITORY must be ${canonicalRepository}`
);
const expectedRepositoryUrl = `git+https://github.com/${repository}.git`;
const expectedHomepage = `https://github.com/${repository}#readme`;
const expectedBugs = `https://github.com/${repository}/issues`;
assert(
  packageJson.repository?.type === "git" &&
    packageJson.repository.url === expectedRepositoryUrl,
  `package repository.url must equal ${expectedRepositoryUrl}`
);
assert(
  packageJson.homepage === expectedHomepage,
  `package homepage must equal ${expectedHomepage}`
);
assert(
  packageJson.bugs?.url === expectedBugs,
  `package bugs.url must equal ${expectedBugs}`
);
assert(tag === `v${packageJson.version}`, "git tag matches package version");

const sourceConstants = readFileSync(join(projectRoot, "src", "constants.ts"), "utf8");
assert(
  sourceConstants.includes(`VERSION = "${packageJson.version}"`),
  "source version matches package version"
);

const readme = readFileSync(join(projectRoot, "README.md"), "utf8");
assert(
  readme.includes(`uses: ${canonicalRepository}@v${packageJson.version}`),
  "README uses the immutable canonical Action release"
);
assert(
  !new RegExp(`${escapeRegex(canonicalRepository)}@v1(?!\\.)`, "u").test(readme),
  "README does not advertise a moving v1 tag before v1.0.0"
);
for (const path of ["RELEASE_CONFIG.md", "docs/releasing.md"]) {
  const contents = readFileSync(join(projectRoot, path), "utf8");
  assert(contents.includes(canonicalRepository), `${path} names the canonical repository`);
}

process.stdout.write(
  `Release preflight: ${packageJson.name}@${packageJson.version} from ${repository} passed\n`
);

function readJson(path) {
  const value = JSON.parse(readFileSync(path, "utf8"));
  assert(typeof value === "object" && value !== null, `${path} contains an object`);
  return value;
}

function assert(condition, description) {
  if (!condition) {
    throw new Error(`Release assertion failed: ${description}`);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
