import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { fal } from "@fal-ai/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type Preferences = {
  falKey: string;
  autoDownload?: boolean;
  downloadDirectory?: string;
};

export function getExtensionPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function resolveDownloadDirectory(): string {
  const { downloadDirectory } = getExtensionPreferences();
  const trimmed = downloadDirectory?.trim();
  if (trimmed) return trimmed;
  return path.join(os.homedir(), "Downloads", "FAL AI");
}

export type MediaFile = {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
  width?: number;
  height?: number;
};

export type FalRunResult<TData> = {
  data: TData;
  requestId?: string;
};

export function configureFal() {
  const { falKey } = getPreferenceValues<Preferences>();
  const credentials = falKey?.trim() || process.env.FAL_KEY?.trim();

  if (!credentials) {
    throw new Error("Missing FAL API key. Add one in Raycast extension preferences, or export FAL_KEY in your shell.");
  }

  fal.config({ credentials });
}

export async function runFal<TData>(
  endpoint: string,
  input: Record<string, unknown>,
  toastTitle = "Running fal.ai model",
): Promise<FalRunResult<TData>> {
  configureFal();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: toastTitle,
    message: endpoint,
  });

  try {
    const result = await fal.subscribe(endpoint, {
      input: compactInput(input),
      logs: true,
      onQueueUpdate(update) {
        toast.message = describeQueueUpdate(update);
      },
    });

    toast.style = Toast.Style.Success;
    toast.title = "Generation complete";
    toast.message = endpoint;

    return {
      data: result.data as TData,
      requestId: result.requestId,
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "fal.ai request failed";
    toast.message = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

export function compactInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null || value === "") {
        return false;
      }
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      return true;
    }),
  );
}

export async function collectMediaUrls(paths: string[] | undefined, rawUrls: string | undefined): Promise<string[]> {
  configureFal();

  const urls = splitTextValues(rawUrls);
  const uploadedUrls = await Promise.all((paths ?? []).map((filePath) => uploadLocalFile(filePath)));

  return [...uploadedUrls, ...urls];
}

export async function collectSingleMediaUrl(paths: string[] | undefined, rawUrls: string | undefined): Promise<string> {
  const urls = await collectMediaUrls(paths, rawUrls);
  if (!urls.length) {
    throw new Error("Choose a local file or provide a URL.");
  }
  return urls[0];
}

export function splitTextValues(rawValue: string | undefined): string[] {
  return (rawValue ?? "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function uploadLocalFile(filePath: string): Promise<string> {
  const normalizedPath = filePath.startsWith("file://") ? new URL(filePath).pathname : filePath;
  const bytes = await readFile(normalizedPath);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const file = new File([arrayBuffer], path.basename(normalizedPath), {
    type: inferMimeType(normalizedPath),
  });

  return fal.storage.upload(file);
}

export async function downloadMedia(
  url: string,
  baseName: string,
  options: { silent?: boolean } = {},
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed with ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? undefined;
  const extension = inferExtensionFromUrl(url) ?? inferExtensionFromMime(contentType) ?? "bin";
  const directory = resolveDownloadDirectory();
  await mkdir(directory, { recursive: true });

  const filePath = path.join(directory, `${sanitizeFilename(baseName)}-${Date.now()}.${extension}`);
  const data = new Uint8Array(await response.arrayBuffer());
  await writeFile(filePath, data);

  if (!options.silent) {
    await showToast({
      style: Toast.Style.Success,
      title: "Downloaded result",
      message: filePath,
    });
  }

  return filePath;
}

export function parseOptionalInteger(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected an integer, got "${value}".`);
  }
  return parsed;
}

export function parseInteger(value: string | undefined, fallback: number): number {
  return parseOptionalInteger(value) ?? fallback;
}

export function parseOptionalFloat(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, got "${value}".`);
  }
  return parsed;
}

export function parseFloatWithFallback(value: string | undefined, fallback: number): number {
  return parseOptionalFloat(value) ?? fallback;
}

function describeQueueUpdate(update: unknown): string {
  if (!update || typeof update !== "object") {
    return "Queued";
  }

  const statusUpdate = update as { status?: string; queue_position?: number; logs?: { message?: string }[] };
  if (statusUpdate.status === "IN_QUEUE" && typeof statusUpdate.queue_position === "number") {
    return `Queued at position ${statusUpdate.queue_position}`;
  }

  if (statusUpdate.status === "IN_PROGRESS") {
    const lastLog = statusUpdate.logs?.at(-1)?.message;
    return lastLog || "In progress";
  }

  return statusUpdate.status ?? "Queued";
}

function inferMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
}

function inferExtensionFromUrl(url: string): string | undefined {
  const pathname = safeUrlPathname(url);
  const extension = pathname ? path.extname(pathname).replace(".", "").toLowerCase() : "";
  return extension || undefined;
}

function inferExtensionFromMime(mimeType: string | undefined): string | undefined {
  switch (mimeType?.split(";")[0]) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    default:
      return undefined;
  }
}

function safeUrlPathname(url: string): string | undefined {
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

function sanitizeFilename(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return sanitized || "fal-result";
}
