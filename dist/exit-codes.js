"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exitCodeForVerdict = exitCodeForVerdict;
const constants_1 = require("./constants");
function exitCodeForVerdict(verdict, options = {}) {
    if (verdict === "PASS")
        return constants_1.EXIT_CODES.PASS;
    if (verdict === "FAIL")
        return constants_1.EXIT_CODES.FAIL;
    return options.failOnReview === true
        ? constants_1.EXIT_CODES.REVIEW_REQUIRED
        : constants_1.EXIT_CODES.PASS;
}
