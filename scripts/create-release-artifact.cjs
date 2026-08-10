#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, join, resolve } = require("node:path");

const { parseSingleNpmPackArtifact } = require("./npm-pack-output.cjs");

const projectRoot = resolve(__dirname, "..");
const packageJson = JSON.parse(
  readFileSync(join(projectRoot, "package.json"), "utf8")
);
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const parentDirectory = process.env.RUNNER_TEMP ?? tmpdir();
const artifactDirectory = mkdtempSync(join(parentDirectory, "mergereceipt-release-"));
const npmCli = process.env.npm_execpath;
const result = spawnSync(
  npmCli === undefined ? npmExecutable : process.execPath,
  npmCli === undefined
    ? [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        artifactDirectory
      ]
    : [
        npmCli,
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        artifactDirectory
      ],
  {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000
  }
);

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`npm pack failed\n${result.stderr ?? ""}`);
}
const artifact = parseSingleNpmPackArtifact(result.stdout ?? "");
const filename = artifact.filename;
assert(typeof filename === "string", "npm returned an artifact filename");
const tarball = join(artifactDirectory, filename);
const contents = readFileSync(tarball);
const sha256 = createHash("sha256").update(contents).digest("hex");
const integrity = `sha512-${createHash("sha512").update(contents).digest("base64")}`;
const checksum = join(artifactDirectory, "SHA256SUMS");
const metadata = join(artifactDirectory, "release-metadata.json");

writeFileSync(checksum, `${sha256}  ${filename}\n`, "utf8");
writeFileSync(
  metadata,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      package: packageJson.name,
      version: packageJson.version,
      filename,
      sha256,
      integrity,
      gitCommit: process.env.GITHUB_SHA ?? null
    },
    null,
    2
  )}\n`,
  "utf8"
);

const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath !== undefined && outputPath.length > 0) {
  appendFileSync(
    outputPath,
    [
      `tarball=${tarball}`,
      `checksum=${checksum}`,
      `metadata=${metadata}`,
      `integrity=${integrity}`,
      ""
    ].join("\n"),
    "utf8"
  );
}
process.stdout.write(
  `Release artifact: ${basename(tarball)}\nPath: ${tarball}\n` +
    `SHA-256: ${sha256}\nIntegrity: ${integrity}\n`
);

function assert(condition, description) {
  if (!condition) {
    throw new Error(`Release artifact assertion failed: ${description}`);
  }
}
