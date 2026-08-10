import { EXIT_CODES, type ExitCode } from "./constants";
import type { Verdict } from "./types";

export function exitCodeForVerdict(
  verdict: Verdict,
  options: { readonly failOnReview?: boolean } = {}
): ExitCode {
  if (verdict === "PASS") return EXIT_CODES.PASS;
  if (verdict === "FAIL") return EXIT_CODES.FAIL;
  return options.failOnReview === true
    ? EXIT_CODES.REVIEW_REQUIRED
    : EXIT_CODES.PASS;
}
