import picomatch from "picomatch";

import { MergeReceiptError } from "../errors";
import type { MergeReceiptConfig } from "../config/schema";
import type { Evidence } from "../types";

export interface FileAnalysisResult {
  readonly testSignal: Evidence;
  readonly sensitiveFiles: Evidence;
}

export function analyzeChangedFiles(
  files: readonly string[],
  analysis: MergeReceiptConfig["analysis"]
): FileAnalysisResult {
  const testMatcher = compileMatcher(analysis.testPatterns, "testPatterns");
  const sourceMatcher = compileMatcher(analysis.sourcePatterns, "sourcePatterns");
  const sensitiveMatcher = compileMatcher(
    analysis.sensitivePatterns,
    "sensitivePatterns"
  );
  const testFiles = files.filter((file) => testMatcher(file));
  const sourceFiles = files.filter(
    (file) => sourceMatcher(file) && !testMatcher(file)
  );
  const sensitiveFiles = files.filter((file) => sensitiveMatcher(file));

  return {
    testSignal: createTestSignal(
      sourceFiles,
      testFiles,
      analysis.requireTestsForChangedCode
    ),
    sensitiveFiles: createSensitiveSignal(sensitiveFiles)
  };
}

function createTestSignal(
  sourceFiles: readonly string[],
  testFiles: readonly string[],
  enabled: boolean
): Evidence {
  const data = {
    sourceFiles,
    testFiles
  };
  if (!enabled) {
    return {
      id: "analysis.tests_changed",
      name: "Test change signal",
      category: "test_signal",
      status: "skipped",
      description: "The test-change heuristic is disabled by configuration.",
      required: false,
      deterministic: true,
      data
    };
  }
  if (sourceFiles.length === 0) {
    return {
      id: "analysis.tests_changed",
      name: "Test change signal",
      category: "test_signal",
      status: "skipped",
      description: "No files matching the configured source patterns changed.",
      required: false,
      deterministic: true,
      data
    };
  }
  if (testFiles.length > 0) {
    return {
      id: "analysis.tests_changed",
      name: "Test change signal",
      category: "test_signal",
      status: "passed",
      description: `${String(sourceFiles.length)} source file(s) and ${String(testFiles.length)} test file(s) changed.`,
      required: false,
      deterministic: true,
      data
    };
  }
  return {
    id: "analysis.tests_changed",
    name: "Test change signal",
    category: "test_signal",
    status: "warning",
    description:
      `${String(sourceFiles.length)} source file(s) changed, but no file matched ` +
      "the configured test patterns. This is a review signal, not proof that tests are missing.",
    required: false,
    deterministic: true,
    data
  };
}

function createSensitiveSignal(files: readonly string[]): Evidence {
  if (files.length === 0) {
    return {
      id: "analysis.sensitive_files",
      name: "Sensitive file signal",
      category: "risk",
      status: "skipped",
      description: "No changed file matched a configured sensitive pattern.",
      required: false,
      deterministic: true,
      data: { files }
    };
  }
  return {
    id: "analysis.sensitive_files",
    name: "Sensitive file signal",
    category: "risk",
    status: "warning",
    description:
      `${String(files.length)} changed file(s) matched configured sensitive patterns. ` +
      "Focused human review is recommended.",
    required: false,
    deterministic: true,
    data: { files }
  };
}

function compileMatcher(
  patterns: readonly string[],
  fieldName: string
): (path: string) => boolean {
  try {
    return picomatch([...patterns], {
      dot: true,
      nocase: true,
      nonegate: true
    });
  } catch (error) {
    throw new MergeReceiptError(`Invalid glob in analysis.${fieldName}`, {
      cause: error
    });
  }
}
