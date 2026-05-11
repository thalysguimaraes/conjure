import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Grid,
  Icon,
  Keyboard,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { clearHistory, HistoryEntry, loadHistory, removeEntry } from "./history";
import { downloadMedia } from "./fal";

type GridItem = {
  entry: HistoryEntry;
  url: string;
  index: number;
};

export default function Command() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    setEntries(await loadHistory());
    setIsLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const items: GridItem[] = entries.flatMap((entry) =>
    entry.media.map((media, index) => ({ entry, url: media.url, index })),
  );

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      aspectRatio="1"
      inset={Grid.Inset.Small}
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search prompts and models"
    >
      {!isLoading && entries.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.Image}
          title="No generations yet"
          description="Run Create Image, Edit Image, Upscale Image, or Create Video to start your history."
        />
      ) : null}
      {items.map(({ entry, url, index }) => (
        <Grid.Item
          key={`${entry.id}-${index}`}
          content={entry.mediaKind === "image" ? { source: url } : { source: Icon.Video, tintColor: Color.Purple }}
          title={entry.prompt?.slice(0, 80) ?? entry.modelTitle}
          subtitle={`${entry.modelTitle} · ${formatRelative(entry.createdAt)}`}
          keywords={[entry.prompt ?? "", entry.modelTitle, entry.endpoint, entry.commandType].filter(Boolean)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={url} icon={Icon.Globe} />
                <Action
                  title="Download & Open"
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDownload(url, entry, "open")}
                />
                <Action
                  title="Download & Show in Finder"
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => handleDownload(url, entry, "finder")}
                />
                <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              </ActionPanel.Section>
              {entry.prompt ? (
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Prompt"
                    content={entry.prompt}
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                </ActionPanel.Section>
              ) : null}
              {entry.requestId ? (
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open Fal.ai Request"
                    url={`https://fal.ai/models/${entry.endpoint}/requests/${entry.requestId}`}
                    icon={Icon.Sidebar}
                  />
                </ActionPanel.Section>
              ) : null}
              <ActionPanel.Section>
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    await removeEntry(entry.id);
                    await refresh();
                  }}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Clear all generation history?",
                      message: "This removes all entries from your local history. Files already downloaded are kept.",
                      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                    });
                    if (confirmed) {
                      await clearHistory();
                      await refresh();
                    }
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

async function handleDownload(url: string, entry: HistoryEntry, action: "open" | "finder") {
  try {
    const filePath = await downloadMedia(url, entry.modelTitle);
    if (action === "finder") {
      await showInFinder(filePath);
    } else {
      await open(filePath);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Download failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
