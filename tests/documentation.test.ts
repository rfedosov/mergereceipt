import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { parseDocument } from "yaml";
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
      "ROADMAP.md",
      "RELEASE_AUDIT.md",
      "RELEASE_CONFIG.md",
      "SECURITY.md",
      "docs/launch/README.md",
      "docs/launch/article-outline.md",
      "docs/launch/hacker-news.md",
      "docs/launch/oss-directories.md",
      "docs/launch/product-hunt.md",
      "docs/launch/reddit.md",
      "docs/launch/x-twitter.md",
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

  it("keeps the README Action sequence copy-paste runnable and read-only", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    const actionExample = readme.match(
      /## Add it to a pull request[\s\S]*?```yaml\n(?<workflow>[\s\S]*?)\n```/u
    )?.groups?.["workflow"];

    expect(readme).toContain("docs/assets/demo.svg");
    expect(readme).toContain("## Try it in 60 seconds");
    expect(readme).toContain("## Add it to a pull request");
    expect(readme.indexOf("## Try it in 60 seconds")).toBeLessThan(
      readme.indexOf("## Why MergeReceipt")
    );
    expect(readme).not.toContain(
      "becomes valid only after the immutable `v0.1.0` release exists"
    );
    expect(actionExample).toBeDefined();
    const workflow = actionExample ?? "";
    expect(
      parseDocument(workflow).errors,
      "README Action example YAML errors"
    ).toEqual([]);

    const checkout =
      "uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803";
    const setupNode =
      "uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38";
    const install = "run: npm ci --ignore-scripts";
    const mergeReceipt = "uses: rfedosov/mergereceipt@v0.1.0";
    const checkoutIndex = workflow.indexOf(checkout);
    const setupNodeIndex = workflow.indexOf(setupNode);
    const installIndex = workflow.indexOf(install);
    const mergeReceiptIndex = workflow.indexOf(mergeReceipt);

    expect(checkoutIndex).toBeGreaterThanOrEqual(0);
    expect(setupNodeIndex).toBeGreaterThan(checkoutIndex);
    expect(installIndex).toBeGreaterThan(setupNodeIndex);
    expect(mergeReceiptIndex).toBeGreaterThan(installIndex);

    const checkoutStep = workflow.slice(checkoutIndex, setupNodeIndex);
    const setupNodeStep = workflow.slice(setupNodeIndex, installIndex);
    expect(checkoutStep).toContain("fetch-depth: 0");
    expect(checkoutStep).toContain("persist-credentials: false");
    expect(setupNodeStep).toContain("node-version: 20");
    expect(workflow).toContain("on:\n  pull_request:");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toContain("pull_request_target:");
    expect(workflow).not.toMatch(/@main\b/u);
    expect(workflow).not.toMatch(/\bsecrets\b/u);
    expect(workflow).not.toMatch(/^\s*[a-z-]+:\s*write\s*$/gmu);
    expect(workflow).not.toMatch(/^\s*permissions:\s*write-all\s*$/gmu);
    expect(readme).toContain("it does **not** install");
  });

  it("keeps all three demo signals independent and honest", () => {
    const demo = readFileSync(join(process.cwd(), "scripts", "demo.cjs"), "utf8");
    const asset = readFileSync(
      join(process.cwd(), "docs", "assets", "demo.svg"),
      "utf8"
    );

    expect(demo).toContain('verify("PASS", 100)');
    expect(demo).toContain('verify("REVIEW_REQUIRED", 85)');
    expect(demo).toContain('verify("REVIEW_REQUIRED", 95)');
    expect(asset).toContain("Actual terminal output generated by the production MergeReceipt CLI.");
    expect(asset).toContain("Evidence Score: 100/100");
    expect(asset).toContain("Verdict: PASS");
  });

  it(
    "runs the production CLI walkthrough in a disposable git repository",
    () => {
      const result = spawnSync(
        process.execPath,
        [join(process.cwd(), "scripts", "demo.cjs")],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 30_000
        }
      );

      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("Evidence Score: 100/100");
      expect(result.stdout).toContain("Evidence Score: 85/100");
      expect(result.stdout).toContain("Evidence Score: 95/100");
    },
    30_000
  );

  it("keeps focused issue forms valid and asks for actionable context", () => {
    const forms = {
      bug: {
        name: "bug_report.yml",
        ids: ["version", "node", "os", "config", "reproduction", "expected", "actual"]
      },
      feature: {
        name: "feature_request.yml",
        ids: ["problem", "workaround", "behavior", "layer", "rationale"]
      },
      documentation: {
        name: "documentation_problem.yml",
        ids: ["location", "friction", "suggestion"]
      }
    } as const;

    for (const [kind, form] of Object.entries(forms)) {
      const contents = readFileSync(
        join(process.cwd(), ".github", "ISSUE_TEMPLATE", form.name),
        "utf8"
      );
      expect(parseDocument(contents).errors, `${kind} form YAML errors`).toEqual([]);
      for (const id of form.ids) {
        expect(contents, `${kind} form field ${id}`).toContain(`id: ${id}`);
      }
    }
  });
});
