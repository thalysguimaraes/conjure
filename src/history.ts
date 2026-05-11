import { LocalStorage } from "@raycast/api";
import crypto from "node:crypto";
import { MediaFile } from "./fal";

export type CommandType = "create-image" | "edit-image" | "upscale-image" | "create-video";

export type HistoryEntry = {
  id: string;
  createdAt: number;
  commandType: CommandType;
  mediaKind: "image" | "video";
  modelTitle: string;
  endpoint: string;
  requestId?: string;
  prompt?: string;
  media: MediaFile[];
};

const STORAGE_KEY = "fal-history";
const MAX_ENTRIES = 50;

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveEntry(entry: Omit<HistoryEntry, "id" | "createdAt">): Promise<HistoryEntry> {
  if (!entry.media.length) {
    return { ...entry, id: "", createdAt: Date.now() };
  }

  const entries = await loadHistory();
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const next = [full, ...entries].slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return full;
}

export async function removeEntry(id: string): Promise<void> {
  const entries = await loadHistory();
  const next = entries.filter((entry) => entry.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
