#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, dirname, join, resolve } = require("node:path");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const projectRoot = resolve(__dirname, "..");
const fixtureRoot = mkdtempSync(join(tmpdir(), "mergereceipt-e2e-"));
const packageDirectory = join(fixtureRoot, "package");
const repository = join(fixtureRoot, "repository");
const npmCliPath = process.env.npm_execpath;
const npxCliPath =
  typeof npmCliPath === "string" ? join(dirname(npmCliPath), "npx-cli.js") : "";
const npmEnvironment = {
  ...process.env,
  npm_config_cache: join(fixtureRoot, "npm-cache")
};
delete npmEnvironment.npm_config_package;
delete npmEnvironment.npm_config_call;

try {
  assert(
    typeof npmCliPath === "string" && existsSync(npmCliPath),
    "npm CLI path is available"
  );
  assert(existsSync(npxCliPath), "npx CLI path is available");
  mkdirSync(packageDirectory, { recursive: true });
  mkdirSync(join(repository, "src", "auth"), { recursive: true });
  mkdirSync(join(repository, "test"), { recursive: true });
  run(process.execPath, [npmCliPath, "init", "--yes"], repository, npmEnvironment);
  writeFileSync(
    join(repository, "package.json"),
    JSON.stringify(
      {
        name: "mergereceipt-e2e-fixture",
        version: "1.0.0",
        private: true,
        scripts: {
          test: "node --test test/session.test.js",
          lint: "node -e \"process.exit(0)\"",
          typecheck: "node -e \"process.exit(0)\"",
          build: "node -e \"process.exit(0)\""
        }
      },
      null,
      2
    ) + "\n"
  );
  writeFileSync(join(repository, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(repository, "src", "auth", "session.js"),
    "exports.add = (left, right) => left + right;\n"
  );
  writeFileSync(
    join(repository, "test", "session.test.js"),
    [
      'const test = require("node:test");',
      'const assert = require("node:assert/strict");',
      'const { add } = require("../src/auth/session");',
      'test("add", () => assert.equal(add(2, 3), 5));',
      ""
    ].join("\n")
  );

  run("git", ["init", "--initial-branch=main"], repository);
  run("git", ["config", "user.email", "mergereceipt-tests@localhost"], repository);
  run("git", ["config", "user.name", "MergeReceipt E2E"], repository);
  commit(repository, "initial fixture");

  const packResult = runAllowFailure(
    process.execPath,
    [
      npmCliPath,
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      packageDirectory
    ],
    projectRoot,
    npmEnvironment
  );
  if (packResult.status !== 0 || packResult.stdout.trim().length === 0) {
    throw new Error(
      `npm pack did not return usable JSON (exit ${String(packResult.status)})\n` +
        `${packResult.stdout}\n${packResult.stderr}`
    );
  }
  const packOutput = packResult.stdout;
  const packed = JSON.parse(packOutput);
  assert(Array.isArray(packed) && packed.length === 1, "npm pack returned one artifact");
  const filename = packed[0]?.filename;
  assert(typeof filename === "string", "npm pack returned an artifact filename");
  const tarball = join(packageDirectory, filename);

  run(
    process.execPath,
    [
      npmCliPath,
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-dev",
      tarball
    ],
    repository,
    npmEnvironment
  );
  const installedPackage = join(repository, "node_modules", "mergereceipt");
  const cli = join(installedPackage, "dist", "cli.js");
  const action = join(projectRoot, "dist", "action", "index.js");

  assert(run(process.execPath, [cli, "--version"], repository).trim() === "0.1.0", "CLI version");
  assert(run(process.execPath, [cli, "--help"], repository).includes("verify"), "CLI help");
  assert(
    run(
      process.execPath,
      [
        "-e",
        'const api = require("mergereceipt"); process.stdout.write(typeof api.runVerification);'
      ],
      repository
    ) === "function",
    "public CommonJS export"
  );
  assert(
    existsSync(join(installedPackage, "schemas", "report.schema.json")),
    "public JSON schema"
  );
  assert(!existsSync(join(installedPackage, "src")), "TypeScript source excluded");
  assert(!existsSync(join(installedPackage, "dist", "action")), "Action bundle excluded from npm");
  assert(
    run(
      process.execPath,
      [npxCliPath, "--offline", "--", "mergereceipt", "--version"],
      repository,
      npmEnvironment
    ).trim() === "0.1.0",
    "local npx binary resolution"
  );
  run(
    process.execPath,
    [npxCliPath, "--offline", "--", "mergereceipt", "init"],
    repository,
    npmEnvironment
  );
  const secondInit = runAllowFailure(process.execPath, [cli, "init"], repository);
  assert(secondInit.status === 2, "init refuses overwrite with exit code 2");
  commit(repository, "install MergeReceipt");

  run("git", ["switch", "--create", "feature"], repository);
  writeFileSync(
    join(repository, "src", "auth", "session.js"),
    [
      "exports.add = (left, right) => left + right;",
      "exports.subtract = (left, right) => left - right;",
      ""
    ].join("\n")
  );
  writeFileSync(
    join(repository, "test", "session.test.js"),
    [
      'const test = require("node:test");',
      'const assert = require("node:assert/strict");',
      'const { add, subtract } = require("../src/auth/session");',
      'test("add", () => assert.equal(add(2, 3), 5));',
      'test("subtract", () => assert.equal(subtract(5, 3), 2));',
      ""
    ].join("\n")
  );
  commit(repository, "feature with tests");

  const terminal = run(
    process.execPath,
    [cli, "verify", "--base", "main"],
    repository
  );
  assert(terminal.includes("Verdict: REVIEW_REQUIRED"), "terminal warning verdict");
  assert(terminal.includes("Evidence Score: 95/100"), "terminal score");

  const jsonOutput = run(
    process.execPath,
    [cli, "verify", "--json", "--base", "main"],
    repository
  );
  const report = JSON.parse(jsonOutput);
  const reportSchema = JSON.parse(
    readFileSync(join(projectRoot, "schemas", "report.schema.json"), "utf8")
  );
  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: true
  });
  addFormats(ajv);
  const validateReport = ajv.compile(reportSchema);
  assert(
    validateReport(report),
    `CLI JSON matches report.schema.json: ${ajv.errorsText(validateReport.errors)}`
  );
  const workspaceCliReport = JSON.parse(
    run(
      process.execPath,
      [
        join(projectRoot, "dist", "cli.js"),
        "verify",
        "--json",
        "--base",
        "main"
      ],
      repository
    )
  );
  assert(
    validateReport(workspaceCliReport),
    `workspace dist CLI JSON matches report.schema.json: ${ajv.errorsText(validateReport.errors)}`
  );
  assert(
    workspaceCliReport.tool.name === "mergereceipt",
    "workspace dist CLI identity"
  );
  assert(report.schemaVersion === 1, "JSON schema version");
  assert(report.verdict === "REVIEW_REQUIRED", "JSON verdict");
  assert(report.score === 95, "JSON score");
  assert(
    report.evidence.some((item) => item.id === "check.tests" && item.status === "passed"),
    "JSON command evidence"
  );

  const strict = runAllowFailure(
    process.execPath,
    [cli, "verify", "--base", "main", "--fail-on-review"],
    repository
  );
  assert(strict.status === 3, "strict review exit code");

  const summary = join(repository, "summary.md");
  const outputs = join(repository, "outputs.txt");
  writeFileSync(summary, "");
  writeFileSync(outputs, "");
  const actionResult = runAllowFailure(process.execPath, [action], repository, {
    ...process.env,
    GITHUB_WORKSPACE: repository,
    GITHUB_STEP_SUMMARY: summary,
    GITHUB_OUTPUT: outputs,
    INPUT_CONFIG: ".mergereceipt.yml",
    INPUT_BASE: "main",
    "INPUT_FAIL-ON-REVIEW": "false"
  });
  assert(actionResult.status === 0, "bundled Action advisory exit code");
  assert(
    readFileSync(summary, "utf8").includes("# MergeReceipt Evidence Report"),
    "bundled Action summary"
  );
  assert(readFileSync(outputs, "utf8").includes("verdict=REVIEW_REQUIRED"), "Action output");

  writeFileSync(
    join(repository, "test", "session.test.js"),
    'throw new Error("intentional verification failure");\n'
  );
  const failed = runAllowFailure(
    process.execPath,
    [cli, "verify", "--base", "main"],
    repository
  );
  assert(failed.status === 1, "required check failure exit code");
  assert(failed.stdout.includes("Verdict: FAIL"), "failed terminal verdict");

  process.stdout.write("MergeReceipt packed-install E2E: passed\n");
} finally {
  if (basename(fixtureRoot).startsWith("mergereceipt-e2e-")) {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function run(command, args, cwd, env = process.env) {
  const result = runAllowFailure(command, args, cwd, env);
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with ${result.status}\n` +
        `${result.stdout}\n${result.stderr}`
    );
  }
  return result.stdout;
}

function runAllowFailure(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120_000,
    killSignal: "SIGKILL"
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function commit(cwd, message) {
  run("git", ["add", "--all"], cwd);
  run("git", ["commit", "--message", message], cwd);
}

function assert(condition, description) {
  if (!condition) {
    throw new Error(`E2E assertion failed: ${description}`);
  }
}
