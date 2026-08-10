import { z } from "zod";
export declare const mergeReceiptConfigSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    checks: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodPipe<z.ZodString, z.ZodTransform<{
        command: string;
        required: boolean;
        timeoutMs: number;
    }, string>>, z.ZodObject<{
        command: z.ZodString;
        required: z.ZodDefault<z.ZodBoolean>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>]>>>;
    analysis: z.ZodDefault<z.ZodObject<{
        requireTestsForChangedCode: z.ZodDefault<z.ZodBoolean>;
        testPatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
        sourcePatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
        sensitivePatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>;
    git: z.ZodDefault<z.ZodObject<{
        base: z.ZodOptional<z.ZodString>;
        includeUncommitted: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type MergeReceiptConfig = z.output<typeof mergeReceiptConfigSchema>;
export type CommandCheckConfig = MergeReceiptConfig["checks"][string];
