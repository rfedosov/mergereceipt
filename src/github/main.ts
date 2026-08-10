import { EXIT_CODES } from "../constants";
import { sanitizeTerminalText } from "../checks/run-command";
import { errorMessage } from "../errors";
import { runAction } from "./action";

void runAction().catch((error: unknown) => {
  process.stderr.write(
    `MergeReceipt fatal error: ${sanitizeTerminalText(errorMessage(error))}\n`
  );
  process.exitCode = EXIT_CODES.ERROR;
});
