export type Scope = "user" | "project" | "local";

export interface MarketplaceOwner {
  name?: string;
  email?: string;
}

export interface MarketplacePluginEntry {
  name: string;
  source: string | { source: string; repo?: string };
  description?: string;
  version?: string;
}

export interface MarketplaceManifest {
  name: string;
  description?: string;
  owner?: MarketplaceOwner;
  plugins: MarketplacePluginEntry[];
}

export interface RegisteredMarketplace {
  name: string;
  source: string;
  cachePath: string;
  addedAt: string;
  lastSyncedAt?: string;
  commit?: string;
  local?: boolean;
}

export interface PluginComponents {
  skills: string[];
  agents: string[];
}

export interface InstalledPlugin {
  name: string;
  marketplace: string;
  scope: Scope;
  enabled: boolean;
  installedAt: string;
  sourceCommit?: string;
  components: PluginComponents;
  files: string[];
  disabled?: Record<string, string>;
}

export interface ClaudishConfig {
  version: 1;
  marketplaces: Record<string, RegisteredMarketplace>;
  plugins: InstalledPlugin[];
}
