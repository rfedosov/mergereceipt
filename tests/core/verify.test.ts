import { afterEach, describe, expect, it } from "vitest";

import { runVerification } from "../../src/core/verify";
import {
  commitAll,
  createGitRepository,
  runGit,
  writeRepositoryFile
} from "../helpers/repository";
import { cleanupTempDirectories } from "../helpers/temp";

afterEach(cleanupTempDirectories);

describe("verification orchestration", () => {
  it("collects command, repository, and analysis evidence into one report", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");
    runGit(repository, ["switch", "--create", "feature"]);
    await writeRepositoryFile(repository, "src/math.ts", "export const n = 2;\n");
    await writeRepositoryFile(repository, "src/math.test.ts", "test('n', () => {});\n");
    commitAll(repository, "feature");
    await writeRepositoryFile(
      repository,
      ".mergereceipt.yml",
      [
        "version: 1",
        "checks:",
        "  tests:",
        "    command: printf '1 passed\\n'",
        "    required: true",
        "analysis:",
        "  sensitivePatterns: []",
        "git:",
        "  base: main",
        "  includeUncommitted: false",
        ""
      ].join("\n")
    );

    const report = await runVerification({
      cwd: repository,
      now: () => new Date("2026-08-09T12:00:00.000Z")
    });

    expect(report.generatedAt).toBe("2026-08-09T12:00:00.000Z");
    expect(report.repository.changedFiles).toEqual([
      "src/math.test.ts",
      "src/math.ts"
    ]);
    expect(report.evidence.map((item) => item.id)).toEqual([
      "check.tests",
      "repository.changed_files",
      "analysis.tests_changed",
      "analysis.sensitive_files"
    ]);
    expect(report.score).toBe(100);
    expect(report.verdict).toBe("PASS");
  });

  it("does not report PASS when no command checks exist", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");
    await writeRepositoryFile(
      repository,
      ".mergereceipt.yml",
      "version: 1\nchecks: {}\n"
    );

    const report = await runVerification({ cwd: repository });

    expect(report.evidence[0]?.id).toBe("checks.none");
    expect(report.score).toBe(80);
    expect(report.verdict).toBe("REVIEW_REQUIRED");
  });

  it("reports missing test changes and sensitive source changes without calling them defects", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "base\n");
    commitAll(repository, "base");
    runGit(repository, ["switch", "--create", "feature"]);
    await writeRepositoryFile(
      repository,
      "src/auth/session.ts",
      "export const authenticated = true;\n"
    );
    commitAll(repository, "change authentication");
    await writeRepositoryFile(
      repository,
      ".mergereceipt.yml",
      [
        "version: 1",
        "checks:",
        "  tests: node --version",
        "git:",
        "  base: main",
        "  includeUncommitted: false",
        ""
      ].join("\n")
    );

    const report = await runVerification({ cwd: repository });
    const testSignal = report.evidence.find(
      (item) => item.id === "analysis.tests_changed"
    );
    const sensitiveSignal = report.evidence.find(
      (item) => item.id === "analysis.sensitive_files"
    );

    expect(report.verdict).toBe("REVIEW_REQUIRED");
    expect(report.score).toBe(80);
    expect(testSignal?.status).toBe("warning");
    expect(testSignal?.description).toContain("not proof");
    expect(sensitiveSignal?.status).toBe("warning");
  });
});
