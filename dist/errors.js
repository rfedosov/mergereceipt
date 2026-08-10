"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeReceiptError = void 0;
exports.errorMessage = errorMessage;
class MergeReceiptError extends Error {
    cause;
    constructor(message, options) {
        super(message);
        this.name = "MergeReceiptError";
        if (options !== undefined && "cause" in options) {
            this.cause = options.cause;
        }
    }
}
exports.MergeReceiptError = MergeReceiptError;
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
