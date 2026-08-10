import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("repository documentation", () => {
  it("keeps public documentation local links resolvable", () => {
    const root = process.cwd();
    const documents = [
      "ARCHITECTURE.md",
      "CHANGELOG.md",
      "CODE_OF_CONDUCT.md",
      "CONTRIBUTING.md",
      "PLAN.md",
      "README.md",
      "RELEASE_AUDIT.md",
      "RELEASE_CONFIG.md",
      "SECURITY.md",
      "docs/json-output.md",
      "docs/releasing.md",
      "docs/semantic-providers.md",
      "examples/README.md"
    ];

    let checkedLinks = 0;
    for (const document of documents) {
      const documentPath = join(root, document);
      const contents = readFileSync(documentPath, "utf8");
      const localTargets = [
        ...contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)
      ]
        .map((match) => match[1])
        .filter((target): target is string => target !== undefined)
        .filter((target) => !/^(?:https?:|mailto:|#)/u.test(target))
        .map((target) => target.split("#", 1)[0])
        .filter(
          (target): target is string =>
            target !== undefined && target.length > 0
        );

      for (const target of localTargets) {
        checkedLinks += 1;
        expect(
          existsSync(resolve(dirname(documentPath), target)),
          `Missing target from ${document}: ${target}`
        ).toBe(true);
      }
    }
    expect(checkedLinks).toBeGreaterThan(0);
  });

  it("documents package/binary naming and score limitations exactly", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

    expect(readme).toContain("npm install --save-dev mergereceipt");
    expect(readme).toContain("npx mergereceipt init");
    expect(readme).toContain(
      "Evidence Score is not a probability that the code is correct."
    );
    expect(readme).toContain(
      "A high score does not mean a pull request is correct."
    );
    expect(readme).toContain(
      "Deterministic checks first. Semantic judgment second. Human decision last."
    );
    expect(readme).toContain(
      "The npm package and installed binary are both `mergereceipt`"
    );
  });

  it("documents the immutable canonical Action tag", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

    expect(readme).toContain("uses: rfedosov/mergereceipt@v0.1.0");
    expect(readme).not.toMatch(/rfedosov\/mergereceipt@v1(?!\.)/u);
  });
});
