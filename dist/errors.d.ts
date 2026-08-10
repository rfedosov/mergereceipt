export declare class MergeReceiptError extends Error {
    readonly cause?: unknown;
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare function errorMessage(error: unknown): string;
