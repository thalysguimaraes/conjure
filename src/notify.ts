import { execFile } from "node:child_process";

export async function notifyMacOS(title: string, message: string, options: { subtitle?: string } = {}): Promise<void> {
  const parts = [`display notification ${appleQuote(message)}`, `with title ${appleQuote(title)}`];
  if (options.subtitle) parts.push(`subtitle ${appleQuote(options.subtitle)}`);
  const script = parts.join(" ");

  await new Promise<void>((resolve) => {
    execFile("osascript", ["-e", script], () => resolve());
  });
}

function appleQuote(value: string): string {
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
