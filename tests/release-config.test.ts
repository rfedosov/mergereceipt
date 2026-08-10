import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTempDirectories, createTempDirectory } from "./helpers/temp";

afterEach(cleanupTempDirectories);

describe("canonical release configuration", () => {
  it("fills npm metadata after validating the canonical Action owner", async () => {
    const directory = await createFixture(
      { name: "mergereceipt" },
      "octo-maintainer"
    );

    const result = runConfigure(directory, "octo-maintainer");

    expect(result.status).toBe(0);
    const packageJson: unknown = JSON.parse(
      await readFile(join(directory, "package.json"), "utf8")
    );
    expect(packageJson).toMatchObject({
      repository: {
        type: "git",
        url: "git+https://github.com/octo-maintainer/mergereceipt.git"
      },
      homepage: "https://github.com/octo-maintainer/mergereceipt#readme",
      bugs: {
        url: "https://github.com/octo-maintainer/mergereceipt/issues"
      }
    });
    expect(await readFile(join(directory, "README.md"), "utf8")).toContain(
      "octo-maintainer/mergereceipt@v0.1.0"
    );
  });

  it("refuses invalid owners and conflicting existing metadata", async () => {
    const invalid = await createFixture(
      { name: "mergereceipt" },
      "invalid-maintainer"
    );
    expect(runConfigure(invalid, "bad/owner").status).not.toBe(0);

    const conflict = await createFixture(
      {
        name: "mergereceipt",
        repository: {
          type: "git",
          url: "git+https://github.com/other-maintainer/mergereceipt.git"
        }
      },
      "octo-maintainer"
    );
    expect(runConfigure(conflict, "octo-maintainer").status).not.toBe(0);
    expect(await readFile(join(conflict, "package.json"), "utf8")).toContain(
      "other-maintainer"
    );
  });
});

async function createFixture(
  packageJson: object,
  actionOwner: string
): Promise<string> {
  const directory = await createTempDirectory();
  const scripts = join(directory, "scripts");
  await mkdir(scripts);
  await copyFile(
    join(process.cwd(), "scripts", "configure-release.cjs"),
    join(scripts, "configure-release.cjs")
  );
  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    join(directory, "README.md"),
    `uses: ${actionOwner}/mergereceipt@v0.1.0\n`,
    "utf8"
  );
  return directory;
}

function runConfigure(directory: string, owner: string) {
  return spawnSync(
    process.execPath,
    [join(directory, "scripts", "configure-release.cjs"), owner],
    { cwd: directory, encoding: "utf8" }
  );
}
