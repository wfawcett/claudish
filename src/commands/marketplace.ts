import type { Command } from "commander";
import * as p from "@clack/prompts";
import {
  addMarketplace,
  getMarketplace,
  listMarketplaces,
  readManifest,
  removeMarketplace,
  updateMarketplace,
} from "../core/marketplace.js";
import { installPlugin } from "../core/plugin.js";
import { ui } from "../core/ui.js";
import type { Scope } from "../core/types.js";

export function registerMarketplaceCommands(cmd: Command): void {
  cmd
    .command("add <source>")
    .description("Add a marketplace from a git repo, owner/repo shorthand, or local path")
    .action((source: string) => {
      const marketplace = addMarketplace(source);
      ui.success(`Added marketplace "${marketplace.name}" from ${marketplace.source}`);
    });

  cmd
    .command("remove <name>")
    .description("Remove a registered marketplace")
    .option("--purge", "Also delete the cached clone")
    .action((name: string, opts: { purge?: boolean }) => {
      removeMarketplace(name, opts.purge);
      ui.success(`Removed marketplace "${name}"`);
    });

  cmd
    .command("update [name]")
    .description("Update one or all marketplaces")
    .action((name: string | undefined) => {
      const targets = name ? [name] : listMarketplaces().map((m) => m.name);
      for (const target of targets) {
        const record = updateMarketplace(target);
        if (record.local) ui.info(`Skipped local marketplace "${target}"`);
        else ui.success(`Updated "${target}"`);
      }
    });

  cmd
    .command("list")
    .description("List registered marketplaces")
    .action(() => {
      const list = listMarketplaces();
      if (list.length === 0) {
        ui.info("No marketplaces registered. Add one with: claudish marketplace add <source>");
        return;
      }
      for (const m of list) {
        ui.info(`${m.name}  ${m.source}${m.local ? "  (local)" : ""}`);
      }
    });

  cmd
    .command("browse <name>")
    .description("Interactively browse and install plugins from a marketplace")
    .option("--scope <scope>", "user, project, or local", "user")
    .action(async (name: string, opts: { scope: Scope }) => {
      const record = getMarketplace(name);
      const manifest = readManifest(record.cachePath);
      if (manifest.plugins.length === 0) {
        ui.info(`Marketplace "${name}" has no plugins.`);
        return;
      }
      const selected = await p.multiselect({
        message: `Select plugins to install from ${name}`,
        required: false,
        options: manifest.plugins.map((plugin) => ({
          value: plugin.name,
          label: plugin.name,
          hint: plugin.description ?? "",
        })),
      });
      if (p.isCancel(selected)) {
        p.cancel("Cancelled.");
        return;
      }
      for (const pluginName of selected as string[]) {
        const result = installPlugin({
          name: pluginName,
          marketplace: name,
          scope: opts.scope,
          cwd: process.cwd(),
        });
        ui.success(
          `Installed ${pluginName} (${result.plugin.components.skills.length} skills, ${result.plugin.components.agents.length} agents)`,
        );
        for (const skipped of result.skipped) ui.warn(`Skipped ${skipped} (already exists; use --force)`);
      }
    });
}
