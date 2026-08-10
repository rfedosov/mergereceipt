import { afterEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadConfig } from "../../src/config/load";
import { mergeReceiptConfigSchema } from "../../src/config/schema";
import { cleanupTempDirectories, createTempDirectory } from "../helpers/temp";

afterEach(cleanupTempDirectories);

describe("MergeReceipt configuration", () => {
  it("normalizes command shorthand and supplies analysis defaults", () => {
    const config = mergeReceiptConfigSchema.parse({
      version: 1,
      checks: { tests: "npm test" }
    });

    expect(config.checks["tests"]).toEqual({
      command: "npm test",
      required: true,
      timeoutMs: 600_000
    });
    expect(config.analysis.requireTestsForChangedCode).toBe(true);
    expect(config.analysis.testPatterns).toContain("**/*.test.*");
    expect(config.git.includeUncommitted).toBe(true);
  });

  it("rejects unknown keys and unsafe check names", () => {
    const unknownKey = mergeReceiptConfigSchema.safeParse({
      version: 1,
      checks: {},
      telemetry: true
    });
    const unsafeName = mergeReceiptConfigSchema.safeParse({
      version: 1,
      checks: { "x; touch file": "true" }
    });

    expect(unknownKey.success).toBe(false);
    expect(unsafeName.success).toBe(false);
  });

  it("bounds the number of configured commands", () => {
    const checks = Object.fromEntries(
      Array.from({ length: 51 }, (_, index) => [`check-${String(index)}`, "true"])
    );

    const parsed = mergeReceiptConfigSchema.safeParse({ version: 1, checks });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("50 command checks");
    }
  });

  it("reports duplicate YAML keys as a configuration error", async () => {
    const directory = await createTempDirectory();
    await writeFile(
      join(directory, ".mergereceipt.yml"),
      "version: 1\nchecks: {}\nchecks: {}\n",
      "utf8"
    );

    await expect(loadConfig(directory)).rejects.toThrow(/Map keys must be unique/u);
  });

  it("walks upward to find the repository configuration", async () => {
    const directory = await createTempDirectory();
    const nested = join(directory, "packages", "api");
    await import("node:fs/promises").then(async ({ mkdir }) => {
      await mkdir(nested, { recursive: true });
    });
    await writeFile(
      join(directory, ".mergereceipt.yml"),
      "version: 1\nchecks:\n  tests: npm test\n",
      "utf8"
    );

    const loaded = await loadConfig(nested);

    expect(loaded.directory).toBe(directory);
    expect(loaded.config.checks["tests"]?.command).toBe("npm test");
  });

  it("rejects an oversized configuration before parsing it", async () => {
    const directory = await createTempDirectory();
    await writeFile(
      join(directory, ".mergereceipt.yml"),
      "x".repeat(1024 * 1024 + 1),
      "utf8"
    );

    await expect(loadConfig(directory)).rejects.toThrow(/1 MiB safety limit/u);
  });
});
