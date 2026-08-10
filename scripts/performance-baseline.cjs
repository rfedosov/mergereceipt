#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, dirname, join, resolve } = require("node:path");
const { performance } = require("node:perf_hooks");

const projectRoot = resolve(__dirname, "..");
const cli = join(projectRoot, "dist", "cli.js");
const repository = mkdtempSync(join(tmpdir(), "mergereceipt-performance-"));

try {
  write("package.json", '{"name":"performance-fixture","private":true}\n');
  write(
    ".mergereceipt.yml",
    [
      "version: 1",
      "checks:",
      "  smoke: node --version",
      "analysis:",
      "  sensitivePatterns: []",
      "git:",
      "  includeUncommitted: false",
      ""
    ].join("\n")
  );
  write("README.md", "baseline\n");
  run("git", ["init", "--initial-branch=main"], repository);
  run("git", ["config", "user.email", "mergereceipt-performance@localhost"], repository);
  run("git", ["config", "user.name", "MergeReceipt Performance"], repository);
  commit("baseline");
  run("git", ["switch", "--create", "feature"], repository);
  write("src/value.js", "exports.value = 1;\n");
  write(
    "test/value.test.js",
    'require("node:assert/strict").equal(require("../src/value").value, 1);\n'
  );
  commit("small verified change");

  const startup = measure(25, () => {
    run(process.execPath, [cli, "--version"], projectRoot);
  });
  const verification = measure(7, () => {
    const output = run(
      process.execPath,
      [cli, "verify", "--json", "--base", "main"],
      repository
    );
    const report = JSON.parse(output);
    if (report.verdict !== "PASS") {
      throw new Error(`Unexpected performance fixture verdict: ${String(report.verdict)}`);
    }
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        cliStartupMs: startup,
        smallRepositoryVerificationMs: verification
      },
      null,
      2
    )}\n`
  );
} finally {
  if (basename(repository).startsWith("mergereceipt-performance-")) {
    rmSync(repository, { recursive: true, force: true });
  }
}

function measure(runs, operation) {
  const values = [];
  for (let index = 0; index < runs; index += 1) {
    const started = performance.now();
    operation();
    values.push(performance.now() - started);
  }
  values.sort((left, right) => left - right);
  const median = values[Math.floor(values.length / 2)] ?? 0;
  const p95 = values[Math.min(values.length - 1, Math.floor(values.length * 0.95))] ?? 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return {
    runs,
    min: round(values[0] ?? 0),
    median: round(median),
    p95: round(p95),
    mean: round(mean)
  };
}

function write(path, contents) {
  const target = join(repository, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

function commit(message) {
  run("git", ["add", "--all"], repository);
  run("git", ["commit", "--message", message], repository);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with ${String(result.status)}\n` +
        `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    );
  }
  return result.stdout ?? "";
}

function round(value) {
  return Math.round(value * 10) / 10;
}
