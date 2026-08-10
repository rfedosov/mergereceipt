"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = runCommand;
exports.collectCommandEvidence = collectCommandEvidence;
exports.summarizeOutput = summarizeOutput;
exports.sanitizeTerminalText = sanitizeTerminalText;
const node_child_process_1 = require("node:child_process");
const constants_1 = require("../constants");
async function runCommand(command, timeoutMs, options) {
    const startedAt = process.hrtime.bigint();
    const maxOutputBytes = options.maxOutputBytes ?? constants_1.MAX_CAPTURED_OUTPUT_BYTES;
    const stdout = new BoundedTailBuffer(maxOutputBytes);
    const stderr = new BoundedTailBuffer(maxOutputBytes);
    return await new Promise((resolve) => {
        let timedOut = false;
        let spawnError;
        let forceKillTimer;
        const child = (0, node_child_process_1.spawn)(command, {
            cwd: options.cwd,
            env: options.env ?? process.env,
            shell: true,
            windowsHide: true,
            detached: process.platform !== "win32",
            stdio: ["ignore", "pipe", "pipe"]
        });
        child.stdout.on("data", (chunk) => {
            stdout.append(chunk);
        });
        child.stderr.on("data", (chunk) => {
            stderr.append(chunk);
        });
        child.on("error", (error) => {
            spawnError = error.message;
        });
        const timeout = setTimeout(() => {
            timedOut = true;
            terminateProcessTree(child, "SIGTERM");
            forceKillTimer = setTimeout(() => {
                terminateProcessTree(child, "SIGKILL");
            }, 2_000);
            forceKillTimer.unref();
        }, timeoutMs);
        timeout.unref();
        child.on("close", (exitCode, signal) => {
            clearTimeout(timeout);
            if (forceKillTimer !== undefined) {
                clearTimeout(forceKillTimer);
            }
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
            const result = {
                exitCode,
                signal,
                durationMs: Math.round(durationMs),
                timedOut,
                stdout: stdout.toString(),
                stderr: stderr.toString(),
                stdoutTruncated: stdout.truncated,
                stderrTruncated: stderr.truncated
            };
            resolve(spawnError === undefined ? result : { ...result, spawnError });
        });
    });
}
async function collectCommandEvidence(name, check, options) {
    const result = await runCommand(check.command, check.timeoutMs, options);
    const passed = result.exitCode === 0 && !result.timedOut && result.spawnError === undefined;
    const stdoutSummary = summarizeOutput(result.stdout);
    const stderrSummary = summarizeOutput(result.stderr);
    const details = formatOutputDetails(stdoutSummary, stderrSummary);
    const description = passed
        ? "Command exited successfully."
        : commandFailureDescription(result, check.timeoutMs);
    const evidence = {
        id: `check.${name}`,
        name: displayCheckName(name),
        category: "command",
        status: passed ? "passed" : "failed",
        description,
        required: check.required,
        deterministic: true,
        durationMs: result.durationMs,
        data: {
            command: check.command,
            exitCode: result.exitCode,
            signal: result.signal,
            timedOut: result.timedOut,
            stdoutSummary,
            stderrSummary,
            stdoutTruncated: result.stdoutTruncated,
            stderrTruncated: result.stderrTruncated
        }
    };
    return details.length === 0 ? evidence : { ...evidence, details };
}
function summarizeOutput(output) {
    const normalized = sanitizeTerminalText(output)
        .replace(/\r\n?/g, "\n")
        .trim();
    if (normalized.length <= constants_1.MAX_SUMMARY_CHARACTERS) {
        return normalized;
    }
    return `… ${normalized.slice(-constants_1.MAX_SUMMARY_CHARACTERS)}`;
}
function sanitizeTerminalText(value) {
    const escapeCharacter = String.fromCharCode(27);
    const ansiPattern = new RegExp(`${escapeCharacter}\\[[0-?]*[ -/]*[@-~]`, "g");
    const withoutAnsi = value.replace(ansiPattern, "");
    let safe = "";
    for (const character of withoutAnsi) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (character === "\n" ||
            character === "\t" ||
            (codePoint >= 32 &&
                codePoint !== 127 &&
                (codePoint < 128 || codePoint > 159))) {
            safe += character;
        }
    }
    return safe;
}
function terminateProcessTree(child, signal) {
    if (child.pid === undefined) {
        return;
    }
    try {
        if (process.platform !== "win32") {
            process.kill(-child.pid, signal);
        }
        else {
            const killer = (0, node_child_process_1.spawn)("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
            killer.unref();
        }
    }
    catch {
        // The process may have exited between the timeout and the signal.
    }
}
function commandFailureDescription(result, timeoutMs) {
    if (result.timedOut) {
        return `Command timed out after ${timeoutMs} ms.`;
    }
    if (result.spawnError !== undefined) {
        return `Command could not start: ${result.spawnError}`;
    }
    if (result.signal !== null) {
        return `Command terminated by ${result.signal}.`;
    }
    return `Command exited with code ${String(result.exitCode)}.`;
}
function formatOutputDetails(stdout, stderr) {
    const sections = [];
    if (stdout.length > 0) {
        sections.push(`stdout:\n${stdout}`);
    }
    if (stderr.length > 0) {
        sections.push(`stderr:\n${stderr}`);
    }
    return sections.join("\n\n");
}
function displayCheckName(name) {
    if (name === "typecheck") {
        return "Typecheck";
    }
    return name
        .split(/[-_]/u)
        .filter((part) => part.length > 0)
        .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
        .join(" ");
}
class BoundedTailBuffer {
    maximumBytes;
    buffer = Buffer.alloc(0);
    truncated = false;
    constructor(maximumBytes) {
        this.maximumBytes = maximumBytes;
    }
    append(value) {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
        if (chunk.length >= this.maximumBytes) {
            this.buffer = chunk.subarray(chunk.length - this.maximumBytes);
            this.truncated = true;
            return;
        }
        const excess = this.buffer.length + chunk.length - this.maximumBytes;
        if (excess > 0) {
            this.buffer = this.buffer.subarray(excess);
            this.truncated = true;
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
    }
    toString() {
        return this.buffer.toString("utf8");
    }
}
