import fs from "node:fs";
import { configFilePath, claudishConfigDir } from "./paths.js";
import type { ClaudishConfig } from "./types.js";

const EMPTY: ClaudishConfig = { version: 1, marketplaces: {}, plugins: [] };

export function loadConfig(): ClaudishConfig {
  const file = configFilePath();
  if (!fs.existsSync(file)) return structuredClone(EMPTY);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<ClaudishConfig>;
    return {
      version: 1,
      marketplaces: parsed.marketplaces ?? {},
      plugins: parsed.plugins ?? [],
    };
  } catch (err) {
    throw new Error(`Failed to read ${file}: ${(err as Error).message}`);
  }
}

export function saveConfig(config: ClaudishConfig): void {
  fs.mkdirSync(claudishConfigDir(), { recursive: true });
  fs.writeFileSync(configFilePath(), JSON.stringify(config, null, 2) + "\n", "utf8");
}
