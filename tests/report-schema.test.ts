import { readFileSync } from "node:fs";
import { join } from "node:path";

import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { AnySchema, ValidateFunction } from "ajv";
import { afterEach, describe, expect, it } from "vitest";

import { runVerification } from "../src/core/verify";
import { renderJsonReport } from "../src/reporters/json";
import {
  commitAll,
  createGitRepository,
  writeRepositoryFile
} from "./helpers/repository";
import { cleanupTempDirectories } from "./helpers/temp";

afterEach(cleanupTempDirectories);

describe("JSON report schema contract", () => {
  it("validates JSON emitted by the production verification pipeline", async () => {
    const repository = await createGitRepository();
    await writeRepositoryFile(repository, "README.md", "fixture\n");
    await writeRepositoryFile(
      repository,
      ".mergereceipt.yml",
      "version: 1\nchecks:\n  smoke: node --version\n"
    );
    commitAll(repository, "fixture");

    const report = await runVerification({
      cwd: repository,
      now: () => new Date("2026-08-10T00:00:00.000Z")
    });
    const cliJson: unknown = JSON.parse(renderJsonReport(report));
    const validate = createValidator();

    expect(validate(cliJson), JSON.stringify(validate.errors)).toBe(true);
    expect(report.scoreBreakdown.final).toBe(report.score);
  });

  it("rejects incompatible top-level drift within schema version 1", () => {
    const validate = createValidator();
    const invalid = {
      schemaVersion: 1,
      unexpected: true
    };

    expect(validate(invalid)).toBe(false);
  });
});

function createValidator(): ValidateFunction {
  const schema: unknown = JSON.parse(
    readFileSync(join(process.cwd(), "schemas", "report.schema.json"), "utf8")
  );
  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: true
  });
  addFormats(ajv);
  return ajv.compile(schema as AnySchema);
}
