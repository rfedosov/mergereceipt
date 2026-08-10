"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const run_command_1 = require("../checks/run-command");
const errors_1 = require("../errors");
const action_1 = require("./action");
void (0, action_1.runAction)().catch((error) => {
    process.stderr.write(`MergeReceipt fatal error: ${(0, run_command_1.sanitizeTerminalText)((0, errors_1.errorMessage)(error))}\n`);
    process.exitCode = constants_1.EXIT_CODES.ERROR;
});
