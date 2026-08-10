#!/usr/bin/env node

const { chmodSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

const cli = resolve(__dirname, "..", "dist", "cli.js");
if (process.platform !== "win32" && existsSync(cli)) {
  chmodSync(cli, 0o755);
}
