function parseSingleNpmPackArtifact(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("npm pack did not return valid JSON");
  }

  const artifacts = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed)
      ? Object.values(parsed)
      : [];
  if (artifacts.length !== 1 || !isRecord(artifacts[0])) {
    throw new Error("npm pack did not return exactly one artifact");
  }
  return artifacts[0];
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

module.exports = { parseSingleNpmPackArtifact };
