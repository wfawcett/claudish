import os from "node:os";
import path from "node:path";
import type { Scope } from "./types.js";

export function homeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

export function claudishConfigDir(): string {
  if (process.env.CLAUDISH_CONFIG_DIR) return process.env.CLAUDISH_CONFIG_DIR;
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg ? path.join(xdg, "claudish") : path.join(homeDir(), ".config", "claudish");
}

export function claudishCacheDir(): string {
  if (process.env.CLAUDISH_CACHE_DIR) return process.env.CLAUDISH_CACHE_DIR;
  const xdg = process.env.XDG_CACHE_HOME;
  return xdg ? path.join(xdg, "claudish") : path.join(homeDir(), ".cache", "claudish");
}

export function configFilePath(): string {
  return path.join(claudishConfigDir(), "config.json");
}

export function marketplacesDir(): string {
  return path.join(claudishCacheDir(), "marketplaces");
}

export function disabledDir(): string {
  return path.join(claudishConfigDir(), "disabled");
}

export function opencodeRoot(scope: Scope, cwd: string): string {
  if (scope === "user") {
    const xdg = process.env.XDG_CONFIG_HOME;
    return xdg ? path.join(xdg, "opencode") : path.join(homeDir(), ".config", "opencode");
  }
  return path.join(cwd, ".opencode");
}

export function skillsDir(scope: Scope, cwd: string): string {
  return path.join(opencodeRoot(scope, cwd), "skills");
}

export function agentsDir(scope: Scope, cwd: string): string {
  return path.join(opencodeRoot(scope, cwd), "agents");
}
