#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, join, resolve } = require("node:path");

const { parseSingleNpmPackArtifact } = require("./npm-pack-output.cjs");

const projectRoot = resolve(__dirname, "..");
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const cacheDirectory = mkdtempSync(join(tmpdir(), "mergereceipt-pack-check-"));

try {
  const npmCli = process.env.npm_execpath;
  const result = spawnSync(
    npmCli === undefined ? npmExecutable : process.execPath,
    npmCli === undefined
      ? ["pack", "--dry-run", "--ignore-scripts", "--json"]
      : [npmCli, "pack", "--dry-run", "--ignore-scripts", "--json"],
    {
      cwd: projectRoot,
      env: { ...process.env, npm_config_cache: cacheDirectory },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm pack --dry-run failed\n${result.stderr ?? ""}`);
  }

  const artifact = parseSingleNpmPackArtifact(result.stdout ?? "");
  const entries = artifact.files;
  assert(Array.isArray(entries), "npm returned a package file list");

  const paths = entries.map((entry) => {
    assert(isRecord(entry) && typeof entry.path === "string", "valid package entry");
    return entry.path;
  });
  const unexpected = paths.filter((path) => !isAllowedPackagePath(path));
  assert(
    unexpected.length === 0,
    `unexpected package files: ${unexpected.join(", ")}`
  );

  for (const required of [
    "LICENSE",
    "README.md",
    "dist/cli.js",
    "dist/index.d.ts",
    "dist/index.js",
    "package.json",
    "schemas/report.schema.json"
  ]) {
    assert(paths.includes(required), `required package file ${required}`);
  }

  assert(!paths.some((path) => path.endsWith(".map")), "source maps are excluded");
  assert(!paths.some((path) => path.startsWith("src/")), "TypeScript sources are excluded");
  assert(!paths.some((path) => path.startsWith("tests/")), "tests are excluded");
  assert(!paths.some((path) => path.startsWith("dist/action/")), "Action bundle is excluded from npm");
  assert(paths.length <= 60, "package contains no more than 60 files");

  const packedSize = numberField(artifact, "size");
  const unpackedSize = numberField(artifact, "unpackedSize");
  assert(packedSize <= 150_000, "packed package stays below 150 kB");
  assert(unpackedSize <= 500_000, "unpacked package stays below 500 kB");

  process.stdout.write(
    `npm package allowlist: passed (${String(paths.length)} files, ` +
      `${String(packedSize)} bytes packed, ${String(unpackedSize)} bytes unpacked)\n`
  );
} finally {
  if (basename(cacheDirectory).startsWith("mergereceipt-pack-check-")) {
    rmSync(cacheDirectory, { recursive: true, force: true });
  }
}

function isAllowedPackagePath(path) {
  if (
    [
      "CHANGELOG.md",
      "LICENSE",
      "README.md",
      "SECURITY.md",
      "docs/json-output.md",
      "package.json",
      "schemas/report.schema.json"
    ].includes(path)
  ) {
    return true;
  }
  return (
    /^dist\/[^/]+\.(?:js|d\.ts)$/u.test(path) ||
    /^dist\/(?:analysis|checks|config|core|git|providers|reporters|scoring)\/[^/]+\.(?:js|d\.ts)$/u.test(
      path
    )
  );
}

function numberField(record, name) {
  const value = record[name];
  assert(typeof value === "number" && Number.isFinite(value), `numeric ${name}`);
  return value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition, description) {
  if (!condition) {
    throw new Error(`Package assertion failed: ${description}`);
  }
}
