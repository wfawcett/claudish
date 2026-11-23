import fs from "node:fs";
import path from "node:path";
import { marketplacesDir } from "./paths.js";
import { loadConfig, saveConfig } from "./config.js";
import { git, gitOrThrow, toCloneUrl } from "./git.js";
import type { MarketplaceManifest, RegisteredMarketplace } from "./types.js";

export function manifestPath(root: string): string {
  return path.join(root, ".claude-plugin", "marketplace.json");
}

export function readManifest(root: string): MarketplaceManifest {
  const file = manifestPath(root);
  if (!fs.existsSync(file)) {
    throw new Error(`No .claude-plugin/marketplace.json found in ${root}`);
  }
  let manifest: MarketplaceManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8")) as MarketplaceManifest;
  } catch (err) {
    throw new Error(`Invalid marketplace.json: ${(err as Error).message}`);
  }
  if (!manifest.name) throw new Error("marketplace.json is missing a name");
  if (!Array.isArray(manifest.plugins)) throw new Error("marketplace.json is missing a plugins array");
  return manifest;
}

function cacheSlug(source: string): string {
  const base = source.replace(/\.git$/, "").replace(/[^A-Za-z0-9_.-]+/g, "-");
  return base.replace(/-+/g, "-").replace(/^-|-$/g, "") || "marketplace";
}

function isLocalDir(source: string): boolean {
  try {
    return fs.statSync(source).isDirectory();
  } catch {
    return false;
  }
}

export function addMarketplace(source: string): RegisteredMarketplace {
  const config = loadConfig();
  const local = isLocalDir(source);
  const cachePath = local ? path.resolve(source) : path.join(marketplacesDir(), cacheSlug(source));
  let commit: string | undefined;

  if (local) {
    readManifest(cachePath);
  } else {
    const url = toCloneUrl(source);
    if (fs.existsSync(path.join(cachePath, ".git"))) {
      gitOrThrow(["fetch", "--all", "--tags"], cachePath);
      gitOrThrow(["pull", "--ff-only"], cachePath);
    } else {
      fs.mkdirSync(marketplacesDir(), { recursive: true });
      gitOrThrow(["clone", "--depth", "1", url, cachePath]);
    }
    commit = gitOrThrow(["rev-parse", "HEAD"], cachePath);
  }

  const manifest = readManifest(cachePath);
  const now = new Date().toISOString();
  const existing = config.marketplaces[manifest.name];
  const record: RegisteredMarketplace = {
    name: manifest.name,
    source,
    cachePath,
    addedAt: existing?.addedAt ?? now,
    lastSyncedAt: now,
    commit,
    local,
  };
  config.marketplaces[manifest.name] = record;
  saveConfig(config);
  return record;
}

export function getMarketplace(name: string): RegisteredMarketplace {
  const record = loadConfig().marketplaces[name];
  if (!record) throw new Error(`Marketplace "${name}" is not registered. Run: claudish marketplace add <source>`);
  return record;
}

export function listMarketplaces(): RegisteredMarketplace[] {
  return Object.values(loadConfig().marketplaces).sort((a, b) => a.name.localeCompare(b.name));
}

export function updateMarketplace(name: string): RegisteredMarketplace {
  const config = loadConfig();
  const record = config.marketplaces[name];
  if (!record) throw new Error(`Marketplace "${name}" is not registered.`);
  if (record.local) return record;
  gitOrThrow(["fetch", "--all", "--tags"], record.cachePath);
  gitOrThrow(["pull", "--ff-only"], record.cachePath);
  record.commit = gitOrThrow(["rev-parse", "HEAD"], record.cachePath);
  record.lastSyncedAt = new Date().toISOString();
  config.marketplaces[name] = record;
  saveConfig(config);
  return record;
}

export function removeMarketplace(name: string, purge = false): void {
  const config = loadConfig();
  const record = config.marketplaces[name];
  if (!record) throw new Error(`Marketplace "${name}" is not registered.`);
  delete config.marketplaces[name];
  saveConfig(config);
  if (purge && !record.local) {
    const root = marketplacesDir();
    const resolved = path.resolve(record.cachePath);
    if (resolved.startsWith(path.resolve(root) + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

export function findPluginMarketplace(pluginName: string, preferred?: string): { marketplace: RegisteredMarketplace; manifest: MarketplaceManifest } {
  if (preferred) {
    const marketplace = getMarketplace(preferred);
    const manifest = readManifest(marketplace.cachePath);
    if (!manifest.plugins.some((p) => p.name === pluginName)) {
      throw new Error(`Plugin "${pluginName}" is not in marketplace "${preferred}".`);
    }
    return { marketplace, manifest };
  }
  const matches: Array<{ marketplace: RegisteredMarketplace; manifest: MarketplaceManifest }> = [];
  for (const marketplace of listMarketplaces()) {
    const manifest = readManifest(marketplace.cachePath);
    if (manifest.plugins.some((p) => p.name === pluginName)) {
      matches.push({ marketplace, manifest });
    }
  }
  if (matches.length === 0) {
    throw new Error(`Plugin "${pluginName}" was not found in any registered marketplace.`);
  }
  if (matches.length > 1) {
    const names = matches.map((m) => m.marketplace.name).join(", ");
    throw new Error(`Plugin "${pluginName}" exists in multiple marketplaces (${names}). Use --marketplace <name>.`);
  }
  return matches[0];
}
