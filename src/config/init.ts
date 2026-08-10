import { lstat, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { stringify } from "yaml";

import { CONFIG_FILENAME, DEFAULT_COMMAND_TIMEOUT_MS } from "../constants";
import { MergeReceiptError } from "../errors";
import {
  DEFAULT_SENSITIVE_PATTERNS,
  DEFAULT_SOURCE_PATTERNS,
  DEFAULT_TEST_PATTERNS
} from "./defaults";
import type { MergeReceiptConfig, CommandCheckConfig } from "./schema";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

interface PackageJsonShape {
  readonly scripts?: Readonly<Record<string, unknown>>;
}

const MAX_PACKAGE_JSON_BYTES = 1024 * 1024;

export interface InitResult {
  readonly path: string;
  readonly projectType: "node" | "unknown";
  readonly packageManager?: PackageManager;
  readonly detectedChecks: readonly string[];
}

export async function initializeConfig(
  directory: string,
  options: { readonly force?: boolean } = {}
): Promise<InitResult> {
  const targetDirectory = resolve(directory);
  const targetPath = join(targetDirectory, CONFIG_FILENAME);
  const existing = await safeLstat(targetPath);

  if (existing?.isSymbolicLink() === true) {
    throw new MergeReceiptError(
      `Refusing to write ${CONFIG_FILENAME} through a symbolic link.`
    );
  }
  if (existing !== undefined && options.force !== true) {
    throw new MergeReceiptError(
      `${CONFIG_FILENAME} already exists. Re-run with --force to replace it.`
    );
  }

  const packagePath = join(targetDirectory, "package.json");
  const packageJson = await readPackageJson(packagePath);
  const packageManager = await detectPackageManager(targetDirectory);
  const checks =
    packageJson === undefined
      ? {}
      : detectChecks(packageJson, packageManager ?? "npm");

  const config: MergeReceiptConfig = {
    version: 1,
    checks,
    analysis: {
      requireTestsForChangedCode: true,
      testPatterns: [...DEFAULT_TEST_PATTERNS],
      sourcePatterns: [...DEFAULT_SOURCE_PATTERNS],
      sensitivePatterns: [...DEFAULT_SENSITIVE_PATTERNS]
    },
    git: {
      includeUncommitted: true
    }
  };

  const header =
    "# MergeReceipt: reproducible verification signals before review or merge.\n" +
    "# Commands in this file execute with your user permissions.\n";
  await writeFile(targetPath, header + stringify(config, { lineWidth: 0 }), {
    encoding: "utf8",
    flag: options.force === true ? "w" : "wx",
    mode: 0o644
  });

  const result: InitResult = {
    path: targetPath,
    projectType: packageJson === undefined ? "unknown" : "node",
    detectedChecks: Object.keys(checks)
  };
  return packageManager === undefined ? result : { ...result, packageManager };
}

export function detectChecks(
  packageJson: PackageJsonShape,
  packageManager: PackageManager
): Record<string, CommandCheckConfig> {
  const scripts = packageJson.scripts ?? {};
  const candidates = [
    ["tests", ["test"]],
    ["lint", ["lint"]],
    ["typecheck", ["typecheck", "type-check", "types"]],
    ["build", ["build"]]
  ] as const;
  const checks: Record<string, CommandCheckConfig> = {};

  for (const [checkName, scriptNames] of candidates) {
    const scriptName = scriptNames.find((name) => {
      const command = scripts[name];
      return (
        typeof command === "string" &&
        command.trim().length > 0 &&
        !/no test specified/i.test(command)
      );
    });
    if (scriptName === undefined) {
      continue;
    }

    checks[checkName] = {
      command: packageScriptCommand(packageManager, scriptName),
      required: true,
      timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS
    };
  }

  return checks;
}

function packageScriptCommand(
  packageManager: PackageManager,
  scriptName: string
): string {
  if (packageManager === "npm" && scriptName === "test") {
    return "npm test";
  }
  if (
    (packageManager === "pnpm" || packageManager === "yarn") &&
    scriptName === "test"
  ) {
    return `${packageManager} test`;
  }
  return `${packageManager} run ${scriptName}`;
}

async function readPackageJson(path: string): Promise<PackageJsonShape | undefined> {
  let metadata: Awaited<ReturnType<typeof stat>>;
  try {
    metadata = await stat(path);
  } catch (error) {
    if (isMissingFile(error)) {
      return undefined;
    }
    throw new MergeReceiptError(`Cannot read ${path}`, { cause: error });
  }
  if (metadata.size > MAX_PACKAGE_JSON_BYTES) {
    throw new MergeReceiptError(`package.json at ${path} exceeds 1 MiB.`);
  }

  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    throw new MergeReceiptError(`Cannot read ${path}`, { cause: error });
  }

  try {
    const parsed: unknown = JSON.parse(contents);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("package.json root must be an object");
    }
    const scriptsValue: unknown = "scripts" in parsed ? parsed.scripts : undefined;
    if (!isUnknownRecord(scriptsValue)) {
      return {};
    }
    return { scripts: scriptsValue };
  } catch (error) {
    throw new MergeReceiptError(`Invalid package.json at ${path}`, { cause: error });
  }
}

async function detectPackageManager(
  directory: string
): Promise<PackageManager | undefined> {
  const lockfiles = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"]
  ] as const;
  for (const [filename, packageManager] of lockfiles) {
    if ((await safeLstat(join(directory, filename))) !== undefined) {
      return packageManager;
    }
  }
  return (await safeLstat(join(directory, "package.json"))) === undefined
    ? undefined
    : "npm";
}

async function safeLstat(path: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissingFile(error)) {
      return undefined;
    }
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
