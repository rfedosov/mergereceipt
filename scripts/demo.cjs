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

const projectRoot = resolve(__dirname, "..");
const cli = join(projectRoot, "dist", "cli.js");
const repository = mkdtempSync(join(tmpdir(), "mergereceipt-demo-"));

try {
  mkdirSync(join(repository, "src", "auth"), { recursive: true });
  mkdirSync(join(repository, "test"), { recursive: true });
  write(
    "package.json",
    `${JSON.stringify(
      {
        name: "mergereceipt-launch-demo",
        version: "1.0.0",
        private: true,
        scripts: {
          test: "node --test",
          lint: "node -e \"process.exit(0)\"",
          typecheck: "node -e \"process.exit(0)\"",
          build: "node -e \"process.exit(0)\""
        }
      },
      null,
      2
    )}\n`
  );
  write(
    "src/auth/session.js",
    "exports.isAuthenticated = (token) => token.length > 0;\n"
  );
  write(
    "test/session.test.js",
    [
      'const test = require("node:test");',
      'const assert = require("node:assert/strict");',
      'const { isAuthenticated } = require("../src/auth/session");',
      'test("accepts a token", () => assert.equal(isAuthenticated("token"), true));',
      ""
    ].join("\n")
  );

  run("git", ["init", "--initial-branch=main"]);
  run("git", ["config", "user.email", "mergereceipt-demo@localhost"]);
  run("git", ["config", "user.name", "MergeReceipt Demo"]);
  run(process.execPath, [cli, "init"]);
  commit("baseline");

  run("git", ["switch", "--create", "clean-change"]);
  write("src/math.js", "exports.add = (left, right) => left + right;\n");
  write(
    "test/math.test.js",
    [
      'const test = require("node:test");',
      'const assert = require("node:assert/strict");',
      'const { add } = require("../src/math");',
      'test("adds", () => assert.equal(add(2, 3), 5));',
      ""
    ].join("\n")
  );
  commit("add source change with focused test");

  heading("A. Clean source change with a matching test change");
  const clean = verify("PASS", 100);
  process.stdout.write(clean);

  run("git", ["switch", "main"]);
  run("git", ["switch", "--create", "source-without-test-change"]);
  write(
    "src/profile.js",
    "exports.displayName = (name) => name.trim();\n"
  );
  commit("change source without test change");

  heading("B. Source changed; test files unchanged");
  const missingTestChange = verify("REVIEW_REQUIRED", 85);
  process.stdout.write(missingTestChange);

  run("git", ["switch", "main"]);
  run("git", ["switch", "--create", "sensitive-change"]);
  write(
    "src/auth/session.js",
    [
      "exports.isAuthenticated = (token) => token.length > 0;",
      "exports.revoke = (sessions, token) => sessions.filter((item) => item !== token);",
      ""
    ].join("\n")
  );
  write(
    "test/session.test.js",
    [
      'const test = require("node:test");',
      'const assert = require("node:assert/strict");',
      'const { isAuthenticated, revoke } = require("../src/auth/session");',
      'test("accepts a token", () => assert.equal(isAuthenticated("token"), true));',
      'test("revokes one token", () => assert.deepEqual(revoke(["a", "b"], "a"), ["b"]));',
      ""
    ].join("\n")
  );
  commit("change authentication with focused test");

  heading("C. Sensitive authentication source and its test changed");
  const sensitive = verify("REVIEW_REQUIRED", 95);
  process.stdout.write(sensitive);
  process.stdout.write("\nDemo completed; the temporary repository will be removed.\n");
} finally {
  if (basename(repository).startsWith("mergereceipt-demo-")) {
    rmSync(repository, { recursive: true, force: true });
  }
}

function verify(expectedVerdict, expectedScore) {
  const result = run(process.execPath, [cli, "verify", "--base", "main"]);
  assert(result.includes(`Verdict: ${expectedVerdict}`), expectedVerdict);
  assert(result.includes(`Evidence Score: ${String(expectedScore)}/100`), String(expectedScore));
  return result;
}

function write(path, contents) {
  const target = join(repository, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

function commit(message) {
  run("git", ["add", "--all"]);
  run("git", ["commit", "--message", message]);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repository,
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

function heading(title) {
  process.stdout.write(`\n=== ${title} ===\n\n`);
}

function assert(condition, description) {
  if (!condition) {
    throw new Error(`Demo assertion failed: ${description}`);
  }
}
