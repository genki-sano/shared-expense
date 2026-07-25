import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AppEnv } from "./app";

const rootEnvPath = resolve(process.cwd(), "../../.env.local");

export function loadLocalDevAppEnv(): AppEnv {
  const localEnv = existsSync(rootEnvPath)
    ? parseLocalEnvFile(readFileSync(rootEnvPath, "utf8"))
    : {};

  return {
    GOOGLE_SPREADSHEET_ID:
      process.env.GOOGLE_SPREADSHEET_ID ?? localEnv.GOOGLE_SPREADSHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL:
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? localEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ?? localEnv.GOOGLE_PRIVATE_KEY,
  };
}

export function parseLocalEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    values[key] = unquoteEnvValue(rawValue);
  }

  return values;
}

function unquoteEnvValue(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}
