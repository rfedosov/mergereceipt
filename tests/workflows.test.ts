import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

const workflowNames = ["ci.yml", "codeql.yml", "release.yml"] as const;

describe("GitHub workflow hardening", () => {
  it("keeps every workflow valid YAML and every external Action SHA-pinned", () => {
    for (const name of workflowNames) {
      const contents = workflow(name);
      const document = parseDocument(contents);
      expect(document.errors, `${name} YAML errors`).toEqual([]);

      const references = [...contents.matchAll(/^\s*-?\s*uses:\s*([^\s#]+).*$/gmu)]
        .map((match) => match[1])
        .filter((reference): reference is string => reference !== undefined)
        .filter((reference) => reference !== "./");
      expect(references.length, `${name} has external actions`).toBeGreaterThan(0);
      for (const reference of references) {
        expect(reference, `${name}: ${reference}`).toMatch(/@[0-9a-f]{40}$/u);
      }
    }
  });

  it("keeps untrusted PR CI read-only and without persisted checkout credentials", () => {
    const ci = workflow("ci.yml");

    expect(ci).toContain("permissions:\n  contents: read");
    expect(ci).toContain("pull_request:");
    expect(ci).not.toContain("pull_request_target:");
    expect(ci.match(/persist-credentials: false/gu)?.length).toBe(2);
    expect(ci).not.toMatch(/secrets\./u);
  });

  it("limits npm publishing authority to the tag release job", () => {
    const release = workflow("release.yml");

    expect(release).toContain("environment: npm");
    expect(release).toContain("contents: write");
    expect(release).toContain("id-token: write");
    expect(release).not.toContain("NODE_AUTH_TOKEN");
    expect(release).not.toMatch(/secrets\.NPM/u);
    expect(release).toContain("persist-credentials: false");
  });
});

function workflow(name: (typeof workflowNames)[number]): string {
  return readFileSync(join(process.cwd(), ".github", "workflows", name), "utf8");
}
