import { z } from "zod";

import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_COMMAND_TIMEOUT_MS
} from "../constants";
import {
  DEFAULT_SENSITIVE_PATTERNS,
  DEFAULT_SOURCE_PATTERNS,
  DEFAULT_TEST_PATTERNS
} from "./defaults";

const commandNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    "check names may contain letters, numbers, underscores, and hyphens"
  );

const commandObjectSchema = z
  .object({
    command: z.string().trim().min(1).max(10_000),
    required: z.boolean().default(true),
    timeoutMs: z
      .number()
      .int()
      .min(100)
      .max(MAX_COMMAND_TIMEOUT_MS)
      .default(DEFAULT_COMMAND_TIMEOUT_MS)
  })
  .strict();

const commandSchema = z.union([
  z.string().trim().min(1).max(10_000).transform((command) => ({
    command,
    required: true,
    timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS
  })),
  commandObjectSchema
]);

const patternsSchema = z.array(z.string().trim().min(1).max(500)).max(200);
const checksSchema = z
  .record(commandNameSchema, commandSchema)
  .refine((checks) => Object.keys(checks).length <= 50, {
    message: "no more than 50 command checks may be configured"
  });

export const mergeReceiptConfigSchema = z
  .object({
    version: z.literal(1),
    checks: checksSchema.default({}),
    analysis: z
      .object({
        requireTestsForChangedCode: z.boolean().default(true),
        testPatterns: patternsSchema.default([...DEFAULT_TEST_PATTERNS]),
        sourcePatterns: patternsSchema.default([...DEFAULT_SOURCE_PATTERNS]),
        sensitivePatterns: patternsSchema.default([
          ...DEFAULT_SENSITIVE_PATTERNS
        ])
      })
      .strict()
      .default({
        requireTestsForChangedCode: true,
        testPatterns: [...DEFAULT_TEST_PATTERNS],
        sourcePatterns: [...DEFAULT_SOURCE_PATTERNS],
        sensitivePatterns: [...DEFAULT_SENSITIVE_PATTERNS]
      }),
    git: z
      .object({
        base: z.string().trim().min(1).max(500).optional(),
        includeUncommitted: z.boolean().default(true)
      })
      .strict()
      .default({ includeUncommitted: true })
  })
  .strict();

export type MergeReceiptConfig = z.output<typeof mergeReceiptConfigSchema>;
export type CommandCheckConfig = MergeReceiptConfig["checks"][string];
