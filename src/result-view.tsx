import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef } from "react";
import { downloadMedia, getExtensionPreferences, MediaFile } from "./fal";
import { CommandType, saveEntry } from "./history";

type ResultViewProps = {
  title: string;
  commandType: CommandType;
  mediaKind: "image" | "video";
  modelTitle: string;
  endpoint: string;
  prompt?: string;
  requestId?: string;
  media: MediaFile[];
  output: unknown;
};

export function ResultView(props: ResultViewProps) {
  const persistedRef = useRef(false);

  useEffect(() => {
    if (persistedRef.current) return;
    persistedRef.current = true;

    if (!props.media.length) return;

    void saveEntry({
      commandType: props.commandType,
      mediaKind: props.mediaKind,
      modelTitle: props.modelTitle,
      endpoint: props.endpoint,
      requestId: props.requestId,
      prompt: props.prompt,
      media: props.media,
    });

    const { autoDownload } = getExtensionPreferences();
    if (autoDownload) {
      void autoDownloadAll(props.media, props.title);
    }
  }, [
    props.commandType,
    props.endpoint,
    props.media,
    props.mediaKind,
    props.modelTitle,
    props.prompt,
    props.requestId,
    props.title,
  ]);

  const firstMedia = props.media[0];
  const numberShortcuts: Keyboard.Shortcut[] = [
    { modifiers: ["cmd"], key: "1" },
    { modifiers: ["cmd"], key: "2" },
    { modifiers: ["cmd"], key: "3" },
    { modifiers: ["cmd"], key: "4" },
  ];

  return (
    <Detail
      navigationTitle={props.title}
      markdown={buildMarkdown(props)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={props.modelTitle} />
          <Detail.Metadata.Label title="Endpoint" text={props.endpoint} />
          {props.requestId ? <Detail.Metadata.Label title="Request ID" text={props.requestId} /> : null}
          <Detail.Metadata.Label title="Results" text={String(props.media.length)} />
          {firstMedia?.width && firstMedia?.height ? (
            <Detail.Metadata.Label title="Size" text={`${firstMedia.width} × ${firstMedia.height}`} />
          ) : null}
          {props.prompt ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Prompt" text={props.prompt} />
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {firstMedia ? (
            <ActionPanel.Section title="First Result">
              <Action.OpenInBrowser title="Open in Browser" url={firstMedia.url} icon={Icon.Globe} />
              <Action
                title="Download & Open"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => handleDownload(firstMedia.url, props.title, "open")}
              />
              <Action
                title="Download & Show in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => handleDownload(firstMedia.url, props.title, "finder")}
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={firstMedia.url}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
          ) : null}
          {props.media.length > 1 ? (
            <ActionPanel.Section title="All Results">
              {props.media.map((media, index) => (
                <Action
                  key={media.url}
                  title={`Open Result ${index + 1}`}
                  icon={Icon.Image}
                  shortcut={index < numberShortcuts.length ? numberShortcuts[index] : undefined}
                  onAction={() => open(media.url)}
                />
              ))}
              <Action
                title="Download All"
                icon={Icon.Download}
                onAction={() => handleDownloadAll(props.media, props.title)}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Copy">
            {props.prompt ? (
              <Action.CopyToClipboard
                title="Copy Prompt"
                content={props.prompt}
                icon={Icon.Text}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy All URLs"
              content={props.media.map((media) => media.url).join("\n")}
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              title="Copy Raw Output JSON"
              content={JSON.stringify(props.output, null, 2)}
              icon={Icon.Code}
            />
          </ActionPanel.Section>
          {props.requestId ? (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open Fal.ai Request"
                url={`https://fal.ai/models/${props.endpoint}/requests/${props.requestId}`}
                icon={Icon.Sidebar}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown({ title, mediaKind, media }: ResultViewProps): string {
  if (!media.length) {
    return `# ${title}\n\nNo media URL was returned.`;
  }

  if (mediaKind === "image") {
    const grid = media.map((file, index) => `![Result ${index + 1}](${file.url})`).join("\n\n");
    return `# ${title}\n\n${grid}`;
  }

  const videos = media
    .map((file, index) => `### Result ${index + 1}\n\n[Open video ${index + 1}](${file.url})`)
    .join("\n\n");
  return `# ${title}\n\n${videos}`;
}

async function handleDownload(url: string, title: string, action: "open" | "finder") {
  try {
    const filePath = await downloadMedia(url, title);
    if (action === "finder") {
      await showInFinder(filePath);
    } else {
      await open(filePath);
    }
  } catch (error) {
    await Clipboard.copy(url);
    await showToast({
      style: Toast.Style.Failure,
      title: "Download failed — URL copied",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleDownloadAll(media: MediaFile[], title: string) {
  let lastPath: string | undefined;
  for (const [index, file] of media.entries()) {
    try {
      lastPath = await downloadMedia(file.url, `${title}-${index + 1}`, { silent: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to download result ${index + 1}`,
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }
  if (lastPath) {
    await showToast({ style: Toast.Style.Success, title: `Downloaded ${media.length} files` });
    await showInFinder(lastPath);
  }
}

async function autoDownloadAll(media: MediaFile[], title: string) {
  for (const [index, file] of media.entries()) {
    try {
      await downloadMedia(file.url, media.length > 1 ? `${title}-${index + 1}` : title, { silent: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Auto-download failed",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }
  await showToast({
    style: Toast.Style.Success,
    title: media.length > 1 ? `Auto-saved ${media.length} files` : "Auto-saved to Downloads",
  });
}
