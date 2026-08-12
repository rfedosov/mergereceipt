#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const { appendFileSync, readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const { parseSingleNpmViewValue } = require("./npm-view-output.cjs");

const projectRoot = resolve(__dirname, "..");
const packageJson = JSON.parse(
  readFileSync(join(projectRoot, "package.json"), "utf8")
);
const expectedIntegrity = process.env.EXPECTED_INTEGRITY;
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const npmCli = process.env.npm_execpath;

assert(typeof expectedIntegrity === "string" && expectedIntegrity.length > 0, "expected integrity is set");
const result = spawnSync(
  npmCli === undefined ? npmExecutable : process.execPath,
  npmCli === undefined
    ? ["view", `${packageJson.name}@${packageJson.version}`, "dist.integrity", "--json"]
    : [
        npmCli,
        "view",
        `${packageJson.name}@${packageJson.version}`,
        "dist.integrity",
        "--json"
      ],
  {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000
  }
);

let published = false;
if (result.status === 0) {
  const registryIntegrity = parseSingleNpmViewValue(result.stdout ?? "");
  assert(
    registryIntegrity === expectedIntegrity,
    "the existing npm version has different tarball integrity"
  );
  published = true;
} else {
  const diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert(/E404|404 Not Found/iu.test(diagnostic), "npm registry lookup completed or returned E404");
}

const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath !== undefined && outputPath.length > 0) {
  appendFileSync(outputPath, `published=${String(published)}\n`, "utf8");
}
process.stdout.write(
  published
    ? "npm registry already contains the identical package artifact.\n"
    : "npm registry does not contain this package version.\n"
);

function assert(condition, description) {
  if (!condition) {
    throw new Error(`Registry assertion failed: ${description}`);
  }
}
