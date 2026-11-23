const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function paint(code: string, text: string): string {
  return useColor ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export const ui = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(`${paint("32", "OK")} ${msg}`),
  warn: (msg: string) => console.warn(`${paint("33", "WARN")} ${msg}`),
  error: (msg: string) => console.error(`${paint("31", "ERR")} ${msg}`),
  dim: (msg: string) => paint("2", msg),
  bold: (msg: string) => paint("1", msg),
};
