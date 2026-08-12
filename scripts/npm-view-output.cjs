function parseSingleNpmViewValue(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("npm view did not return valid JSON");
  }

  const values = Array.isArray(parsed) ? parsed : [parsed];
  if (values.length !== 1 || typeof values[0] !== "string") {
    throw new Error("npm view did not return exactly one string value");
  }
  return values[0];
}

module.exports = { parseSingleNpmViewValue };
