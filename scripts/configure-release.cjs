#!/usr/bin/env node

const { readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const projectRoot = resolve(__dirname, "..");
const packagePath = join(projectRoot, "package.json");
const readmePath = join(projectRoot, "README.md");
const owner = process.argv[2];

if (
  typeof owner !== "string" ||
  !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(owner)
) {
  throw new Error("Pass the canonical GitHub owner as the first argument.");
}

const repository = `${owner}/mergereceipt`;
const repositoryUrl = `git+https://github.com/${repository}.git`;
const homepage = `https://github.com/${repository}#readme`;
const bugsUrl = `https://github.com/${repository}/issues`;
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const readme = readFileSync(readmePath, "utf8");

assertCompatible(packageJson.repository?.url, repositoryUrl, "repository.url");
assertCompatible(packageJson.homepage, homepage, "homepage");
assertCompatible(packageJson.bugs?.url, bugsUrl, "bugs.url");

const canonicalAction = `${repository}@v0.1.0`;
if (!readme.includes(canonicalAction)) {
  throw new Error(
    `README.md must contain the canonical Action reference ${canonicalAction}.`
  );
}

packageJson.repository = { type: "git", url: repositoryUrl };
packageJson.homepage = homepage;
packageJson.bugs = { url: bugsUrl };

writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
process.stdout.write(`Configured canonical repository ${repository}.\n`);

function assertCompatible(current, expected, field) {
  if (current !== undefined && current !== expected) {
    throw new Error(
      `Refusing to replace existing package.json ${field}: ${String(current)}`
    );
  }
}
