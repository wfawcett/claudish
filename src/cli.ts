#!/usr/bin/env node
import { Command } from "commander";
import { registerMarketplaceCommands } from "./commands/marketplace.js";
import { registerPluginCommands } from "./commands/plugin.js";

const program = new Command();

program
  .name("claudish")
  .description("Use Claude Code marketplace plugins (skills, agents, hooks, MCP) in OpenCode")
  .version("0.1.0");

const marketplace = program.command("marketplace").description("Manage Claude plugin marketplaces");
registerMarketplaceCommands(marketplace);

const plugin = program.command("plugin").description("Install and manage plugins");
registerPluginCommands(plugin);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
