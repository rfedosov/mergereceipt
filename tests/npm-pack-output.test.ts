import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

type Artifact = Record<string, unknown>;
type NpmPackOutputModule = {
  parseSingleNpmPackArtifact: (stdout: string) => Artifact;
};

const loadCjs = createRequire(__filename);
const { parseSingleNpmPackArtifact } = loadCjs(
  "../scripts/npm-pack-output.cjs"
) as NpmPackOutputModule;

describe("npm pack JSON compatibility", () => {
  const artifact = {
    filename: "mergereceipt-0.1.0.tgz",
    files: [{ path: "package.json" }]
  };

  it("accepts the npm 11 array response", () => {
    expect(parseSingleNpmPackArtifact(JSON.stringify([artifact]))).toEqual(
      artifact
    );
  });

  it("accepts the npm 12 package-keyed response", () => {
    expect(
      parseSingleNpmPackArtifact(
        JSON.stringify({ mergereceipt: artifact })
      )
    ).toEqual(artifact);
  });

  it("rejects invalid or ambiguous responses", () => {
    expect(() => parseSingleNpmPackArtifact("not json")).toThrow(
      "valid JSON"
    );
    expect(() =>
      parseSingleNpmPackArtifact(JSON.stringify([artifact, artifact]))
    ).toThrow("exactly one artifact");
  });
});
