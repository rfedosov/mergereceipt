export class MergeReceiptError extends Error {
  public override readonly cause?: unknown;

  public constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "MergeReceiptError";
    if (options !== undefined && "cause" in options) {
      this.cause = options.cause;
    }
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
