import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";

import { parseDocument } from "yaml";

import { CONFIG_FILENAME } from "../constants";
import { MergeReceiptError } from "../errors";
import {
  mergeReceiptConfigSchema,
  type MergeReceiptConfig
} from "./schema";

const MAX_CONFIG_BYTES = 1024 * 1024;

export interface LoadedConfig {
  readonly path: string;
  readonly directory: string;
  readonly config: MergeReceiptConfig;
}

export async function findConfigPath(
  startDirectory: string,
  explicitPath?: string
): Promise<string> {
  if (explicitPath !== undefined) {
    return isAbsolute(explicitPath)
      ? explicitPath
      : resolve(startDirectory, explicitPath);
  }

  let current = resolve(startDirectory);
  const root = parse(current).root;

  for (;;) {
    const candidate = join(current, CONFIG_FILENAME);
    try {
      await stat(candidate);
      return candidate;
    } catch (error) {
      if (!isMissingFile(error)) {
        throw new MergeReceiptError(`Cannot read ${candidate}`, { cause: error });
      }
    }

    if (current === root) {
      throw new MergeReceiptError(
        `No ${CONFIG_FILENAME} found. Run \`mergereceipt init\` first.`
      );
    }
    current = dirname(current);
  }
}

export async function loadConfig(
  startDirectory: string,
  explicitPath?: string
): Promise<LoadedConfig> {
  const path = await findConfigPath(startDirectory, explicitPath);
  let metadata: Awaited<ReturnType<typeof stat>>;

  try {
    metadata = await stat(path);
  } catch (error) {
    throw new MergeReceiptError(`Cannot read configuration at ${path}`, {
      cause: error
    });
  }
  if (metadata.size > MAX_CONFIG_BYTES) {
    throw new MergeReceiptError(
      `Configuration at ${path} exceeds the 1 MiB safety limit.`
    );
  }

  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    throw new MergeReceiptError(`Cannot read configuration at ${path}`, {
      cause: error
    });
  }

  if (Buffer.byteLength(contents) > MAX_CONFIG_BYTES) {
    throw new MergeReceiptError(
      `Configuration at ${path} exceeds the 1 MiB safety limit.`
    );
  }

  const document = parseDocument(contents, {
    merge: false,
    uniqueKeys: true
  });
  if (document.errors.length > 0) {
    const detail = document.errors.map((error) => error.message).join("; ");
    throw new MergeReceiptError(`Invalid YAML in ${path}: ${detail}`);
  }

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 50 });
  } catch (error) {
    throw new MergeReceiptError(`Unsafe or invalid YAML in ${path}`, {
      cause: error
    });
  }

  const parsed = mergeReceiptConfigSchema.safeParse(value);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => {
        const location = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${location}: ${issue.message}`;
      })
      .join("; ");
    throw new MergeReceiptError(`Invalid MergeReceipt configuration: ${detail}`);
  }

  return {
    path,
    directory: dirname(path),
    config: parsed.data
  };
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
