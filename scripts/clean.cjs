#!/usr/bin/env node

const { rmSync } = require("node:fs");
const { isAbsolute, relative, resolve, sep } = require("node:path");

const projectRoot = resolve(__dirname, "..");
const outputDirectory = resolve(projectRoot, "dist");

const relativeOutput = relative(projectRoot, outputDirectory);
if (
  relativeOutput.length > 0 &&
  relativeOutput !== ".." &&
  !relativeOutput.startsWith(`..${sep}`) &&
  !isAbsolute(relativeOutput)
) {
  rmSync(outputDirectory, { recursive: true, force: true });
}
