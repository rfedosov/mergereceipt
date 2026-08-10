import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { VERSION } from "../src/constants";

describe("release metadata", () => {
  it("keeps the CLI and package versions synchronized", () => {
    const packageJson: unknown = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    );

    expect(packageJson).toMatchObject({
      name: "mergereceipt",
      version: VERSION
    });
  });
});
