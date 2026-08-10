import { describe, expect, it } from "vitest";

import { exitCodeForVerdict } from "../src/exit-codes";

describe("verification exit codes", () => {
  it("keeps review warnings advisory by default", () => {
    expect(exitCodeForVerdict("PASS")).toBe(0);
    expect(exitCodeForVerdict("REVIEW_REQUIRED")).toBe(0);
    expect(exitCodeForVerdict("FAIL")).toBe(1);
  });

  it("supports a strict CI policy for review warnings", () => {
    expect(
      exitCodeForVerdict("REVIEW_REQUIRED", { failOnReview: true })
    ).toBe(3);
  });
});
