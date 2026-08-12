import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

type NpmViewOutputModule = {
  parseSingleNpmViewValue: (stdout: string) => string;
};

const loadCjs = createRequire(__filename);
const { parseSingleNpmViewValue } = loadCjs(
  "../scripts/npm-view-output.cjs"
) as NpmViewOutputModule;

describe("npm view JSON compatibility", () => {
  const integrity = "sha512-example";

  it("accepts the npm 11 scalar response", () => {
    expect(parseSingleNpmViewValue(JSON.stringify(integrity))).toBe(integrity);
  });

  it("accepts the npm 12 single-value array response", () => {
    expect(parseSingleNpmViewValue(JSON.stringify([integrity]))).toBe(integrity);
  });

  it("rejects invalid, ambiguous, or non-string responses", () => {
    expect(() => parseSingleNpmViewValue("not json")).toThrow("valid JSON");
    expect(() =>
      parseSingleNpmViewValue(JSON.stringify([integrity, integrity]))
    ).toThrow("exactly one string value");
    expect(() => parseSingleNpmViewValue(JSON.stringify([null]))).toThrow(
      "exactly one string value"
    );
  });
});
