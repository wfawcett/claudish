import { spawnSync } from "node:child_process";

export interface GitResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export function git(args: string[], cwd?: string): GitResult {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (res.error) throw res.error;
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

export function gitOrThrow(args: string[], cwd?: string): string {
  const res = git(args, cwd);
  if (res.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

export function isShorthandRepo(source: string): boolean {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source);
}

export function toCloneUrl(source: string): string {
  if (isShorthandRepo(source)) return `https://github.com/${source}.git`;
  return source;
}
