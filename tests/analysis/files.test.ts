import { describe, expect, it } from "vitest";

import { analyzeChangedFiles } from "../../src/analysis/files";
import { mergeReceiptConfigSchema } from "../../src/config/schema";

const defaults = mergeReceiptConfigSchema.parse({ version: 1 }).analysis;

describe("changed-file analysis", () => {
  it("warns without claiming that missing test changes are a defect", () => {
    const result = analyzeChangedFiles(["src/feature.ts"], defaults);

    expect(result.testSignal.status).toBe("warning");
    expect(result.testSignal.description).toContain("not proof");
  });

  it("recognizes common test layouts at the root and in nested folders", () => {
    const result = analyzeChangedFiles(
      ["src/feature.ts", "feature.spec.ts", "packages/api/__tests__/api.ts"],
      defaults
    );

    expect(result.testSignal.status).toBe("passed");
    expect(result.testSignal.data?.["testFiles"]).toEqual([
      "feature.spec.ts",
      "packages/api/__tests__/api.ts"
    ]);
  });

  it("detects sensitive areas case-insensitively", () => {
    const result = analyzeChangedFiles(
      ["src/Auth/session.ts", ".github/workflows/release.yml", "package-lock.json"],
      defaults
    );

    expect(result.sensitiveFiles.status).toBe("warning");
    expect(result.sensitiveFiles.data?.["files"]).toHaveLength(3);
  });

  it("honors custom patterns and a disabled test signal", () => {
    const result = analyzeChangedFiles(["core/main.lua", "critical.rules"], {
      ...defaults,
      requireTestsForChangedCode: false,
      sourcePatterns: ["**/*.lua"],
      sensitivePatterns: ["*.rules"]
    });

    expect(result.testSignal.status).toBe("skipped");
    expect(result.sensitiveFiles.status).toBe("warning");
  });
});
