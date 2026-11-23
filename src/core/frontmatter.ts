export function readFrontmatter(content: string): { data: string; body: string } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  return { data: match[1], body: content.slice(match[0].length) };
}

export function rewriteFrontmatterName(content: string, name: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return `---\nname: ${name}\n---\n\n${content}`;
  let fm = match[1];
  if (/^name:.*$/m.test(fm)) {
    fm = fm.replace(/^name:.*$/m, `name: ${name}`);
  } else {
    fm = `name: ${name}\n${fm}`;
  }
  return content.replace(match[0], `---\n${fm}\n---`);
}

export function sanitizeName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, 64) || "plugin";
}
