import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  launchCommand,
  LaunchType,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { findOptionModel, videoAspectRatios, videoDurations, videoModels, videoResolutions } from "./model-options";
import { OptionDropdown } from "./form-fields";
import { collectSingleMediaUrl, MediaFile, parseOptionalInteger } from "./fal";
import { inputDirectory, runJob } from "./jobs";

type CreateVideoValues = {
  model: string;
  prompt: string;
  imageFiles: string[];
  imageUrl: string;
  endImageFiles: string[];
  endImageUrl: string;
  resolution: string;
  duration: string;
  aspectRatio: string;
  generateAudio: boolean;
  seed: string;
};

type VideoOutput = {
  video?: MediaFile;
  seed?: number;
};

export type CreateVideoJobContext = {
  command: "create-video";
  modelId: string;
  prompt: string;
  values: CreateVideoValues;
};

export default function Command() {
  const [modelId, setModelId] = useState(videoModels[0].id);
  const selectedModel = useMemo(() => findOptionModel(videoModels, modelId), [modelId]);

  async function handleSubmit(values: CreateVideoValues) {
    const prompt = values.prompt.trim();
    if (!prompt) {
      await showToast({ style: Toast.Style.Failure, title: "Prompt is required" });
      return;
    }

    const model = findOptionModel(videoModels, values.model);

    if (model.inputMode === "image") {
      const hasStart = (values.imageFiles?.length ?? 0) > 0 || values.imageUrl?.trim();
      if (!hasStart) {
        await showToast({ style: Toast.Style.Failure, title: "Add a start frame" });
        return;
      }
    }

    const context: CreateVideoJobContext = {
      command: "create-video",
      modelId: values.model,
      prompt,
      values,
    };

    await launchCommand({ name: "worker", type: LaunchType.Background, context });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  return (
    <Form
      enableDrafts
      navigationTitle="Create Video"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Video" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <OptionDropdown
        id="model"
        title="Model"
        options={videoModels.map((model) => ({ title: model.title, value: model.id }))}
        value={modelId}
        onChange={setModelId}
        info={selectedModel.description}
        storeValue
      />
      <Form.Description title="Endpoint" text={selectedModel.endpoint} />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe scene, action, camera, sound, and dialogue. Put spoken dialogue in quotes."
        enableMarkdown={false}
      />

      {selectedModel.inputMode === "image" ? (
        <>
          <Form.Separator />
          <Form.FilePicker
            id="imageFiles"
            title="Start Frame"
            allowMultipleSelection={false}
            canChooseDirectories={false}
          />
          <Form.TextField
            id="imageUrl"
            title="Start URL"
            placeholder="Optional URL if you do not choose a file"
            storeValue
          />
          <Form.FilePicker
            id="endImageFiles"
            title="End Frame"
            allowMultipleSelection={false}
            canChooseDirectories={false}
          />
          <Form.TextField id="endImageUrl" title="End URL" placeholder="Optional final frame URL" storeValue />
        </>
      ) : null}

      <Form.Separator />
      <OptionDropdown id="resolution" title="Resolution" options={videoResolutions} defaultValue="720p" storeValue />
      <OptionDropdown id="duration" title="Duration" options={videoDurations} defaultValue="auto" storeValue />
      <OptionDropdown
        id="aspectRatio"
        title="Aspect Ratio"
        options={videoAspectRatios}
        defaultValue="auto"
        storeValue
      />
      <Form.Checkbox id="generateAudio" title="Audio" label="Generate synchronized audio" defaultValue storeValue />
      <Form.TextField id="seed" title="Seed" placeholder="Optional integer" storeValue />
    </Form>
  );
}

export async function runCreateVideoFromContext(ctx: CreateVideoJobContext): Promise<void> {
  const model = findOptionModel(videoModels, ctx.modelId);
  await runJob<VideoOutput>({
    label: "Video",
    commandType: "create-video",
    mediaKind: "video",
    modelTitle: model.title,
    endpoint: model.endpoint,
    prompt: ctx.prompt,
    outputDirectory: model.inputMode === "image" ? inputDirectory(ctx.values.imageFiles) : undefined,
    prepare: async () => {
      const imageUrl =
        model.inputMode === "image"
          ? await collectSingleMediaUrl(ctx.values.imageFiles, ctx.values.imageUrl)
          : undefined;
      const endImageUrl =
        model.inputMode === "image" && (ctx.values.endImageFiles?.length || ctx.values.endImageUrl?.trim())
          ? await collectSingleMediaUrl(ctx.values.endImageFiles, ctx.values.endImageUrl)
          : undefined;
      return {
        input: {
          prompt: ctx.prompt,
          image_url: imageUrl,
          end_image_url: endImageUrl,
          resolution: ctx.values.resolution || "720p",
          duration: ctx.values.duration || "auto",
          aspect_ratio: ctx.values.aspectRatio || "auto",
          generate_audio: ctx.values.generateAudio,
          seed: parseOptionalInteger(ctx.values.seed),
        },
      };
    },
    extractMedia: (data) => (data.video ? [data.video] : []),
  });
}
