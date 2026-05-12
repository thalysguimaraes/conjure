import path from "node:path";
import { downloadMedia, MediaFile, runFal } from "./fal";
import { CommandType, saveEntry } from "./history";
import { notifyMacOS } from "./notify";

export type RunJobParams<TData> = {
  label: string;
  commandType: CommandType;
  mediaKind: "image" | "video";
  modelTitle: string;
  endpoint: string;
  prompt?: string;
  outputDirectory?: string;
  prepare: () => Promise<{ input: Record<string, unknown> }>;
  extractMedia: (data: TData) => MediaFile[];
};

export async function runJob<TData>(params: RunJobParams<TData>): Promise<void> {
  try {
    const { input } = await params.prepare();
    const result = await runFal<TData>(params.endpoint, input);
    const media = params.extractMedia(result.data);

    if (!media.length) {
      await notifyMacOS("Conjure", "No media returned", { subtitle: params.modelTitle });
      return;
    }

    await saveEntry({
      commandType: params.commandType,
      mediaKind: params.mediaKind,
      modelTitle: params.modelTitle,
      endpoint: params.endpoint,
      requestId: result.requestId,
      prompt: params.prompt,
      media,
    });

    const downloaded: string[] = [];
    for (const [index, file] of media.entries()) {
      const baseName = media.length > 1 ? `${params.modelTitle}-${index + 1}` : params.modelTitle;
      const filePath = await downloadMedia(file.url, baseName, {
        silent: true,
        directory: params.outputDirectory,
      });
      downloaded.push(filePath);
    }

    const message =
      downloaded.length > 1
        ? `${downloaded.length} files in ${prettyPath(path.dirname(downloaded[0]))}`
        : `Saved to ${prettyPath(downloaded[0])}`;
    await notifyMacOS("Conjure", message, {
      subtitle: `${params.label} ready · ${params.modelTitle}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await notifyMacOS("Conjure", message, {
      subtitle: `${params.label} failed · ${params.modelTitle}`,
    });
  }
}

export function inputDirectory(paths?: string[]): string | undefined {
  if (!paths?.length) return undefined;
  const first = paths[0];
  const normalized = first.startsWith("file://") ? new URL(first).pathname : first;
  return path.dirname(normalized);
}

function prettyPath(p: string): string {
  const home = process.env.HOME;
  if (home && p.startsWith(home)) return "~" + p.slice(home.length);
  return p;
}
