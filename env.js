"use strict";

const fs = require("fs");

function loadEnvFile(filePath, environment = process.env) {
  if (!fs.existsSync(filePath)) {
    return { loaded: false, keys: [] };
  }

  const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const keys = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (Object.prototype.hasOwnProperty.call(environment, key)) {
      continue;
    }

    environment[key] = parseEnvValue(rawValue);
    keys.push(key);
  }

  return { loaded: true, keys };
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, "\"")
      .replace(/\\\\/g, "\\");
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "").trim();
}

module.exports = {
  loadEnvFile
};
