import { afterEach, describe, expect, it } from "vitest";
import { readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { detectChecks, initializeConfig } from "../../src/config/init";
import { loadConfig } from "../../src/config/load";
import { cleanupTempDirectories, createTempDirectory } from "../helpers/temp";

afterEach(cleanupTempDirectories);

describe("mergereceipt init", () => {
  it("detects useful package scripts and ignores npm's default test stub", () => {
    const checks = detectChecks(
      {
        scripts: {
          test: 'echo "Error: no test specified" && exit 1',
          lint: "eslint .",
          "type-check": "tsc --noEmit",
          build: "tsc"
        }
      },
      "npm"
    );

    expect(Object.keys(checks)).toEqual(["lint", "typecheck", "build"]);
    expect(checks["typecheck"]?.command).toBe("npm run type-check");
  });

  it("creates a valid configuration and refuses an implicit overwrite", async () => {
    const directory = await createTempDirectory();
    await writeFile(join(directory, "package-lock.json"), "{}\n", "utf8");
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ scripts: { test: "vitest run", build: "tsc" } }),
      "utf8"
    );

    const result = await initializeConfig(directory);
    const loaded = await loadConfig(directory);

    expect(result.projectType).toBe("node");
    expect(result.packageManager).toBe("npm");
    expect(result.detectedChecks).toEqual(["tests", "build"]);
    expect(loaded.config.checks["tests"]?.command).toBe("npm test");
    await expect(initializeConfig(directory)).rejects.toThrow(/--force/u);
  });

  it.skipIf(process.platform === "win32")(
    "refuses to overwrite through a symbolic link even with force",
    async () => {
      const directory = await createTempDirectory();
      const target = join(directory, "outside.yml");
      await writeFile(target, "unchanged\n", "utf8");
      await symlink(target, join(directory, ".mergereceipt.yml"));

      await expect(initializeConfig(directory, { force: true })).rejects.toThrow(
        /symbolic link/u
      );
      expect(await readFile(target, "utf8")).toBe("unchanged\n");
    }
  );

  it("treats a malformed scripts field as no detected scripts", async () => {
    const directory = await createTempDirectory();
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ scripts: null }),
      "utf8"
    );

    const result = await initializeConfig(directory);

    expect(result.detectedChecks).toEqual([]);
  });
});
