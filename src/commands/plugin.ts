import type { Command } from "commander";
import {
  disablePlugin,
  enablePlugin,
  installPlugin,
  listPlugins,
  uninstallPlugin,
} from "../core/plugin.js";
import { ui } from "../core/ui.js";
import type { Scope } from "../core/types.js";

interface ScopeOptions {
  marketplace?: string;
  scope: Scope;
  force?: boolean;
  json?: boolean;
}

function parsePluginSpec(spec: string): { name: string; marketplace?: string } {
  const at = spec.lastIndexOf("@");
  if (at > 0) return { name: spec.slice(0, at), marketplace: spec.slice(at + 1) };
  return { name: spec };
}

export function registerPluginCommands(cmd: Command): void {
  cmd
    .command("install <plugin>")
    .description("Install a plugin (use name@marketplace or --marketplace)")
    .option("--marketplace <name>", "Marketplace to install from")
    .option("--scope <scope>", "user, project, or local", "user")
    .option("--force", "Overwrite existing files")
    .action((spec: string, opts: ScopeOptions) => {
      const parsed = parsePluginSpec(spec);
      const result = installPlugin({
        name: parsed.name,
        marketplace: opts.marketplace ?? parsed.marketplace,
        scope: opts.scope,
        cwd: process.cwd(),
        force: opts.force,
      });
      ui.success(
        `Installed ${result.plugin.name}@${result.plugin.marketplace} (scope: ${result.plugin.scope}) ` +
          `[${result.plugin.components.skills.length} skills, ${result.plugin.components.agents.length} agents]`,
      );
      for (const skipped of result.skipped) ui.warn(`Skipped ${skipped} (already exists; use --force)`);
    });

  cmd
    .command("uninstall <plugin>")
    .description("Uninstall a plugin")
    .option("--marketplace <name>", "Marketplace the plugin came from")
    .option("--scope <scope>", "user, project, or local")
    .action((name: string, opts: ScopeOptions) => {
      const removed = uninstallPlugin(name, opts.marketplace, opts.scope);
      ui.success(`Uninstalled ${removed.name}@${removed.marketplace} (scope: ${removed.scope})`);
    });

  cmd
    .command("enable <plugin>")
    .description("Re-enable a disabled plugin")
    .option("--marketplace <name>")
    .option("--scope <scope>")
    .action((name: string, opts: ScopeOptions) => {
      const plugin = enablePlugin(name, opts.marketplace, opts.scope);
      ui.success(`Enabled ${plugin.name}@${plugin.marketplace} (scope: ${plugin.scope})`);
    });

  cmd
    .command("disable <plugin>")
    .description("Disable a plugin without uninstalling it")
    .option("--marketplace <name>")
    .option("--scope <scope>")
    .action((name: string, opts: ScopeOptions) => {
      const plugin = disablePlugin(name, opts.marketplace, opts.scope);
      ui.success(`Disabled ${plugin.name}@${plugin.marketplace} (scope: ${plugin.scope})`);
    });

  cmd
    .command("list")
    .description("List installed plugins")
    .option("--json", "Print JSON")
    .action((opts: { json?: boolean }) => {
      const plugins = listPlugins();
      if (opts.json) {
        console.log(JSON.stringify(plugins, null, 2));
        return;
      }
      if (plugins.length === 0) {
        ui.info("No plugins installed.");
        return;
      }
      for (const plugin of plugins) {
        const state = plugin.enabled ? "enabled" : "disabled";
        const skills = plugin.components.skills.length;
        const agents = plugin.components.agents.length;
        ui.info(
          `${plugin.name}@${plugin.marketplace}  [${state}]  scope=${plugin.scope}  skills=${skills} agents=${agents}`,
        );
      }
    });

  cmd
    .command("details <plugin>")
    .description("Show details for an installed plugin")
    .option("--marketplace <name>")
    .option("--scope <scope>")
    .action((name: string, opts: ScopeOptions) => {
      const plugin = listPlugins().find(
        (p) =>
          p.name === name &&
          (!opts.marketplace || p.marketplace === opts.marketplace) &&
          (!opts.scope || p.scope === opts.scope),
      );
      if (!plugin) throw new Error(`Plugin "${name}" is not installed.`);
      console.log(JSON.stringify(plugin, null, 2));
    });
}
