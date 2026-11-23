import fs from "node:fs";
import path from "node:path";
import { agentsDir, claudishCacheDir, disabledDir, skillsDir } from "./paths.js";
import { loadConfig, saveConfig } from "./config.js";
import { findPluginMarketplace } from "./marketplace.js";
import { rewriteFrontmatterName, sanitizeName } from "./frontmatter.js";
import { gitOrThrow, toCloneUrl } from "./git.js";
import type {
  InstalledPlugin,
  MarketplacePluginEntry,
  RegisteredMarketplace,
  Scope,
} from "./types.js";

export interface InstallOptions {
  name: string;
  marketplace?: string;
  scope: Scope;
  cwd: string;
  force?: boolean;
}

function walkFiles(dir: string, pred: (file: string) => boolean): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && pred(full)) out.push(full);
    }
  }
  return out.sort();
}

function clonePlugin(repo: string, pluginName: string): string {
  const dest = path.join(claudishCacheDir(), "plugins", sanitizeName(pluginName));
  const url = toCloneUrl(repo);
  if (fs.existsSync(path.join(dest, ".git"))) {
    gitOrThrow(["fetch", "--all", "--tags"], dest);
    gitOrThrow(["pull", "--ff-only"], dest);
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    gitOrThrow(["clone", "--depth", "1", url, dest]);
  }
  return dest;
}

function resolvePluginRoot(entry: MarketplacePluginEntry, marketplace: RegisteredMarketplace): string {
  const src = entry.source;
  if (typeof src === "string") {
    const asPath = path.resolve(marketplace.cachePath, src);
    if (src.startsWith(".") || src.startsWith("/") || fs.existsSync(asPath)) return asPath;
    return clonePlugin(src, entry.name);
  }
  if (src && typeof src === "object" && src.repo) return clonePlugin(src.repo, entry.name);
  throw new Error(`Unsupported source for plugin "${entry.name}"`);
}

function listSkills(root: string): Array<{ dir: string; name: string }> {
  const skillsRoot = path.join(root, "skills");
  if (!fs.existsSync(skillsRoot)) return [];
  return walkFiles(skillsRoot, (file) => path.basename(file) === "SKILL.md").map((file) => {
    const dir = path.dirname(file);
    return { dir, name: path.basename(dir) };
  });
}

function listAgents(root: string): Array<{ file: string; name: string }> {
  const agentsRoot = path.join(root, "agents");
  if (!fs.existsSync(agentsRoot)) return [];
  return walkFiles(agentsRoot, (file) => file.endsWith(".md")).map((file) => ({
    file,
    name: path.basename(file, ".md"),
  }));
}

export interface InstallResult {
  plugin: InstalledPlugin;
  skipped: string[];
}

export function installPlugin(opts: InstallOptions): InstallResult {
  const { marketplace, manifest } = findPluginMarketplace(opts.name, opts.marketplace);
  const entry = manifest.plugins.find((p) => p.name === opts.name)!;
  const pluginRoot = resolvePluginRoot(entry, marketplace);
  const prefix = sanitizeName(opts.name);
  const skipped: string[] = [];
  const files: string[] = [];
  const skills: string[] = [];
  const agents: string[] = [];

  const skillDestRoot = skillsDir(opts.scope, opts.cwd);
  for (const skill of listSkills(pluginRoot)) {
    const destName = sanitizeName(`${prefix}-${skill.name}`);
    const dest = path.join(skillDestRoot, destName);
    if (fs.existsSync(dest) && !opts.force) {
      skipped.push(`skill ${skill.name}`);
      continue;
    }
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(skill.dir, dest, { recursive: true });
    const skillMd = path.join(dest, "SKILL.md");
    fs.writeFileSync(skillMd, rewriteFrontmatterName(fs.readFileSync(skillMd, "utf8"), destName), "utf8");
    files.push(dest);
    skills.push(destName);
  }

  const agentDestRoot = agentsDir(opts.scope, opts.cwd);
  for (const agent of listAgents(pluginRoot)) {
    const destName = sanitizeName(`${prefix}-${agent.name}`);
    const dest = path.join(agentDestRoot, `${destName}.md`);
    if (fs.existsSync(dest) && !opts.force) {
      skipped.push(`agent ${agent.name}`);
      continue;
    }
    fs.mkdirSync(agentDestRoot, { recursive: true });
    fs.copyFileSync(agent.file, dest);
    files.push(dest);
    agents.push(destName);
  }

  const config = loadConfig();
  config.plugins = config.plugins.filter(
    (p) => !(p.name === opts.name && p.marketplace === marketplace.name && p.scope === opts.scope),
  );
  const plugin: InstalledPlugin = {
    name: opts.name,
    marketplace: marketplace.name,
    scope: opts.scope,
    enabled: true,
    installedAt: new Date().toISOString(),
    sourceCommit: marketplace.commit,
    components: { skills, agents },
    files,
  };
  config.plugins.push(plugin);
  saveConfig(config);
  return { plugin, skipped };
}

export function listPlugins(): InstalledPlugin[] {
  return loadConfig().plugins.sort(
    (a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope),
  );
}

function selectPlugin(
  name: string,
  marketplace?: string,
  scope?: Scope,
): { config: ReturnType<typeof loadConfig>; plugin: InstalledPlugin } {
  const config = loadConfig();
  const matches = config.plugins.filter(
    (p) => p.name === name && (!marketplace || p.marketplace === marketplace) && (!scope || p.scope === scope),
  );
  if (matches.length === 0) throw new Error(`Plugin "${name}" is not installed.`);
  if (matches.length > 1) throw new Error(`Plugin "${name}" is installed in multiple scopes. Use --scope.`);
  return { config, plugin: matches[0] };
}

export function uninstallPlugin(name: string, marketplace?: string, scope?: Scope): InstalledPlugin {
  const { config, plugin } = selectPlugin(name, marketplace, scope);
  for (const file of plugin.files) fs.rmSync(file, { recursive: true, force: true });
  if (plugin.disabled) {
    for (const stored of Object.values(plugin.disabled)) fs.rmSync(stored, { recursive: true, force: true });
  }
  config.plugins = config.plugins.filter((p) => p !== plugin);
  saveConfig(config);
  return plugin;
}

export function disablePlugin(name: string, marketplace?: string, scope?: Scope): InstalledPlugin {
  const { config, plugin } = selectPlugin(name, marketplace, scope);
  if (!plugin.enabled) return plugin;
  const store = path.join(disabledDir(), sanitizeName(name));
  fs.mkdirSync(store, { recursive: true });
  const mapping: Record<string, string> = {};
  for (const file of plugin.files) {
    if (!fs.existsSync(file)) continue;
    const stored = path.join(store, path.basename(file));
    fs.rmSync(stored, { recursive: true, force: true });
    fs.renameSync(file, stored);
    mapping[file] = stored;
  }
  plugin.enabled = false;
  plugin.disabled = mapping;
  saveConfig(config);
  return plugin;
}

export function enablePlugin(name: string, marketplace?: string, scope?: Scope): InstalledPlugin {
  const { config, plugin } = selectPlugin(name, marketplace, scope);
  if (plugin.enabled) return plugin;
  for (const [dest, stored] of Object.entries(plugin.disabled ?? {})) {
    if (!fs.existsSync(stored)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(stored, dest);
  }
  plugin.enabled = true;
  plugin.disabled = {};
  saveConfig(config);
  return plugin;
}
