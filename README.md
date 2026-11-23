# claudish

Use [Claude Code](https://code.claude.com) marketplace plugins in [OpenCode](https://opencode.ai).

`claudish` is a small CLI that registers Claude plugin marketplaces, lets you browse and install their plugins, and materializes the parts OpenCode can consume ? **skills** and **agents** ? into the right OpenCode config directories. It tracks what it installed so you can enable, disable, update, and uninstall cleanly.

It aims for **parity with Claude Code's plugin workflow** wherever practical.

## Install

```bash
npm install -g claudish
# or run without installing
npx claudish --help
```

Requires Node.js 20+ and `git`.

## Quick start

```bash
# Register a marketplace (GitHub owner/repo, git URL, or local path)
claudish marketplace add mattpocock/skills

# Browse and pick plugins interactively
claudish marketplace browse mattpocock

# Or install directly
claudish plugin install mattpocock-skills@mattpocock --scope project

# See what you have
claudish plugin list
```

Restart OpenCode to pick up newly installed skills and agents.

## Commands

### Marketplaces

| Command | Description |
| --- | --- |
| `claudish marketplace add <source>` | Register a marketplace from `owner/repo`, a git URL, or a local path |
| `claudish marketplace remove <name> [--purge]` | Unregister a marketplace (optionally delete the cached clone) |
| `claudish marketplace update [name]` | Pull the latest for one or all marketplaces |
| `claudish marketplace list` | List registered marketplaces |
| `claudish marketplace browse <name> [--scope user\|project\|local]` | Interactively select and install plugins |

A marketplace is a repository or directory containing `.claude-plugin/marketplace.json`, exactly as Claude Code defines it.

### Plugins

| Command | Description |
| --- | --- |
| `claudish plugin install <plugin[@marketplace]> [--marketplace <name>] [--scope <s>] [--force]` | Install a plugin |
| `claudish plugin uninstall <plugin> [--marketplace <name>] [--scope <s>]` | Remove a plugin and its files |
| `claudish plugin enable <plugin>` / `disable <plugin>` | Toggle a plugin without uninstalling |
| `claudish plugin list [--json]` | List installed plugins |
| `claudish plugin details <plugin>` | Show the full install record as JSON |

## Scopes

Claude Code's three scopes map onto OpenCode's config locations:

| Scope | Where files go | Typical use |
| --- | --- | --- |
| `user` (default) | `~/.config/opencode/skills` and `~/.config/opencode/agents` | You, in every project |
| `project` | `<cwd>/.opencode/skills` and `<cwd>/.opencode/agents` | Everyone in the repository |
| `local` | `<cwd>/.opencode` (same as project) | You, in this repository |

> OpenCode has no separate local scope. `claudish` records the scope in its manifest so you can tell installs apart; use your VCS ignore rules if you do not want local installs committed.

## What gets imported

- **Skills** ? every `**/SKILL.md` under the plugin's `skills/` directory (nested category folders are supported). Skills are installed as `<plugin>-<skill>` and their frontmatter `name` is rewritten to match the folder, as OpenCode requires.
- **Agents** ? every `*.md` under the plugin's `agents/` directory, installed as `<plugin>-<agent>.md`.

Collisions are skipped with a warning; pass `--force` to overwrite.

### Roadmap

- **Hooks** ? translate Claude hook events (`PreToolUse`, `PostToolUse`, ?) into OpenCode events, with a shim fallback for unsupported events.
- **MCP servers** ? register imported servers directly in OpenCode's `mcp` config, tracking ownership for clean uninstall.
- **Commands** ? map Claude plugin commands to OpenCode commands.
- **LSP servers** ? parity with Claude's bundled LSP support.

## Where state lives

- Config and install manifest: `~/.config/claudish/config.json` (override with `CLAUDISH_CONFIG_DIR`)
- Marketplace/plugin clones: `~/.cache/claudish` (override with `CLAUDISH_CACHE_DIR`)
- Disabled plugins are parked under `~/.config/claudish/disabled`

## Security

Claude marketplaces are third-party catalogs. `claudish` currently imports **skills and agents only** ? markdown instructions, no code execution. Hooks and MCP servers execute code and will require explicit opt-in when they land. Review a plugin before installing it.

## Development

```bash
npm install
npm run build      # tsc -> dist
npm run typecheck  # tsc --noEmit
node dist/cli.js --help
```

## License

MIT
