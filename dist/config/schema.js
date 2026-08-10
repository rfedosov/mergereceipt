"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeReceiptConfigSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const defaults_1 = require("./defaults");
const commandNameSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "check names may contain letters, numbers, underscores, and hyphens");
const commandObjectSchema = zod_1.z
    .object({
    command: zod_1.z.string().trim().min(1).max(10_000),
    required: zod_1.z.boolean().default(true),
    timeoutMs: zod_1.z
        .number()
        .int()
        .min(100)
        .max(constants_1.MAX_COMMAND_TIMEOUT_MS)
        .default(constants_1.DEFAULT_COMMAND_TIMEOUT_MS)
})
    .strict();
const commandSchema = zod_1.z.union([
    zod_1.z.string().trim().min(1).max(10_000).transform((command) => ({
        command,
        required: true,
        timeoutMs: constants_1.DEFAULT_COMMAND_TIMEOUT_MS
    })),
    commandObjectSchema
]);
const patternsSchema = zod_1.z.array(zod_1.z.string().trim().min(1).max(500)).max(200);
const checksSchema = zod_1.z
    .record(commandNameSchema, commandSchema)
    .refine((checks) => Object.keys(checks).length <= 50, {
    message: "no more than 50 command checks may be configured"
});
exports.mergeReceiptConfigSchema = zod_1.z
    .object({
    version: zod_1.z.literal(1),
    checks: checksSchema.default({}),
    analysis: zod_1.z
        .object({
        requireTestsForChangedCode: zod_1.z.boolean().default(true),
        testPatterns: patternsSchema.default([...defaults_1.DEFAULT_TEST_PATTERNS]),
        sourcePatterns: patternsSchema.default([...defaults_1.DEFAULT_SOURCE_PATTERNS]),
        sensitivePatterns: patternsSchema.default([
            ...defaults_1.DEFAULT_SENSITIVE_PATTERNS
        ])
    })
        .strict()
        .default({
        requireTestsForChangedCode: true,
        testPatterns: [...defaults_1.DEFAULT_TEST_PATTERNS],
        sourcePatterns: [...defaults_1.DEFAULT_SOURCE_PATTERNS],
        sensitivePatterns: [...defaults_1.DEFAULT_SENSITIVE_PATTERNS]
    }),
    git: zod_1.z
        .object({
        base: zod_1.z.string().trim().min(1).max(500).optional(),
        includeUncommitted: zod_1.z.boolean().default(true)
    })
        .strict()
        .default({ includeUncommitted: true })
})
    .strict();
