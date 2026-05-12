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
import {
  accelerationLevels,
  findOptionModel,
  imageEditModels,
  imageSizes,
  jpegPngFormats,
  outputFormats,
  safetyTolerances,
  ImageEditModel,
} from "./model-options";
import { OptionDropdown } from "./form-fields";
import {
  collectMediaUrls,
  compactInput,
  MediaFile,
  parseFloatWithFallback,
  parseInteger,
  parseOptionalFloat,
  parseOptionalInteger,
} from "./fal";
import { inputDirectory, runJob } from "./jobs";

type EditImageValues = {
  model: string;
  prompt: string;
  imageFiles: string[];
  imageUrls: string;
  numImages: string;
  aspectRatio: string;
  outputFormat: string;
  safetyTolerance: string;
  resolution: string;
  limitGenerations: boolean;
  enableWebSearch: boolean;
  thinkingLevel: string;
  seed: string;
  imageSize: string;
  numInferenceSteps: string;
  guidanceScale: string;
  strength: string;
  negativePrompt: string;
  acceleration: string;
  enableSafetyChecker: boolean;
};

type ImageOutput = {
  images?: MediaFile[];
};

export type EditImageJobContext = {
  command: "edit-image";
  modelId: string;
  prompt: string;
  values: EditImageValues;
};

export default function Command() {
  const [modelId, setModelId] = useState(imageEditModels[0].id);
  const selectedModel = useMemo(() => findOptionModel(imageEditModels, modelId), [modelId]);

  async function handleSubmit(values: EditImageValues) {
    const prompt = values.prompt.trim();
    if (!prompt) {
      await showToast({ style: Toast.Style.Failure, title: "Prompt is required" });
      return;
    }

    const hasFiles = (values.imageFiles?.length ?? 0) > 0;
    const hasUrls = (values.imageUrls?.trim()?.length ?? 0) > 0;
    if (!hasFiles && !hasUrls) {
      await showToast({ style: Toast.Style.Failure, title: "Add at least one input image" });
      return;
    }

    const model = findOptionModel(imageEditModels, values.model);
    if (model.inputMode === "single" && hasFiles && values.imageFiles.length > 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "This model accepts one image",
        message: "Use only the first image or pick a Nano Banana edit model.",
      });
      return;
    }

    const context: EditImageJobContext = {
      command: "edit-image",
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
      navigationTitle="Edit Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <OptionDropdown
        id="model"
        title="Model"
        options={imageEditModels.map((model) => ({ title: model.title, value: model.id }))}
        value={modelId}
        onChange={setModelId}
        info={selectedModel.description}
        storeValue
      />
      <Form.Description title="Endpoint" text={selectedModel.endpoint} />
      <Form.TextArea
        id="prompt"
        title="Edit Prompt"
        placeholder="Describe what to change and what to preserve."
        enableMarkdown={false}
      />
      <Form.FilePicker
        id="imageFiles"
        title={selectedModel.inputMode === "single" ? "Input Image" : "Reference Images"}
        allowMultipleSelection={selectedModel.inputMode === "multiple"}
        canChooseDirectories={false}
      />
      <Form.TextArea
        id="imageUrls"
        title="Image URLs"
        placeholder={
          selectedModel.inputMode === "single" ? "Optional URL for the input image" : "Optional URLs, one per line"
        }
        enableMarkdown={false}
        info="Local files are uploaded to fal storage before the model runs."
      />

      <Form.Separator />
      {selectedModel.id === "qwen-image-edit" ? <QwenFields /> : <NanoEditFields model={selectedModel} />}
    </Form>
  );
}

function NanoEditFields({ model }: { model: ImageEditModel }) {
  return (
    <>
      <OptionDropdown
        id="aspectRatio"
        title="Aspect Ratio"
        options={model.aspectRatios}
        defaultValue="auto"
        storeValue
      />
      <OptionDropdown
        id="resolution"
        title="Resolution"
        options={model.resolutions}
        defaultValue={model.defaultResolution}
        storeValue
      />
      <Form.TextField id="numImages" title="Images" defaultValue="1" placeholder="1-4" storeValue />
      <OptionDropdown id="outputFormat" title="Format" options={outputFormats} defaultValue="png" storeValue />
      <OptionDropdown
        id="safetyTolerance"
        title="Safety"
        options={safetyTolerances}
        defaultValue="4"
        info="1 is strictest, 6 is loosest."
        storeValue
      />
      <Form.Checkbox
        id="limitGenerations"
        title="Generation"
        label="Limit intermediate generations to one final image per requested image"
        defaultValue={model.defaultLimitGenerations}
        storeValue
      />
      <Form.Checkbox id="enableWebSearch" title="Grounding" label="Enable web search" defaultValue={false} storeValue />
      {model.supportsThinking ? (
        <OptionDropdown
          id="thinkingLevel"
          title="Thinking"
          options={[
            { title: "Off", value: "off" },
            { title: "Minimal", value: "minimal" },
            { title: "High", value: "high" },
          ]}
          defaultValue="off"
          storeValue
        />
      ) : null}
      <Form.TextField id="seed" title="Seed" placeholder="Optional integer" storeValue />
    </>
  );
}

function QwenFields() {
  return (
    <>
      <OptionDropdown id="imageSize" title="Image Size" options={imageSizes} defaultValue="square_hd" storeValue />
      <Form.TextField id="numImages" title="Images" defaultValue="1" placeholder="1 or more" storeValue />
      <Form.TextField id="numInferenceSteps" title="Steps" defaultValue="30" placeholder="30" storeValue />
      <Form.TextField id="guidanceScale" title="Guidance" defaultValue="4" placeholder="4" storeValue />
      <Form.TextField id="strength" title="Strength" defaultValue="0.94" placeholder="0.94" storeValue />
      <Form.TextField id="negativePrompt" title="Negative Prompt" defaultValue="blurry, ugly" storeValue />
      <OptionDropdown
        id="acceleration"
        title="Acceleration"
        options={accelerationLevels}
        defaultValue="regular"
        storeValue
      />
      <OptionDropdown id="outputFormat" title="Format" options={jpegPngFormats} defaultValue="png" storeValue />
      <Form.Checkbox id="enableSafetyChecker" title="Safety" label="Enable safety checker" defaultValue storeValue />
      <Form.TextField id="seed" title="Seed" placeholder="Optional integer" storeValue />
    </>
  );
}

export async function runEditImageFromContext(ctx: EditImageJobContext): Promise<void> {
  const model = findOptionModel(imageEditModels, ctx.modelId);
  await runJob<ImageOutput>({
    label: "Edit",
    commandType: "edit-image",
    mediaKind: "image",
    modelTitle: model.title,
    endpoint: model.endpoint,
    prompt: ctx.prompt,
    outputDirectory: inputDirectory(ctx.values.imageFiles),
    prepare: async () => {
      const imageUrls = await collectMediaUrls(ctx.values.imageFiles, ctx.values.imageUrls);
      if (!imageUrls.length) throw new Error("No usable input images.");
      if (model.inputMode === "single" && imageUrls.length > 1) {
        throw new Error("Model accepts only one image.");
      }
      const input =
        model.id === "qwen-image-edit"
          ? buildQwenInput(ctx.values, ctx.prompt, imageUrls[0])
          : buildNanoInput(model, ctx.values, ctx.prompt, imageUrls);
      return { input };
    },
    extractMedia: (data) => data.images ?? [],
  });
}

function buildNanoInput(model: ImageEditModel, values: EditImageValues, prompt: string, imageUrls: string[]) {
  const numImages = parseInteger(values.numImages, 1);
  if (numImages < 1 || numImages > 4) {
    throw new Error("Images must be between 1 and 4.");
  }

  return {
    prompt,
    num_images: numImages,
    aspect_ratio: values.aspectRatio || "auto",
    output_format: values.outputFormat || "png",
    safety_tolerance: values.safetyTolerance || "4",
    sync_mode: false,
    image_urls: imageUrls,
    resolution: values.resolution || model.defaultResolution,
    limit_generations: values.limitGenerations,
    enable_web_search: values.enableWebSearch,
    thinking_level: model.supportsThinking && values.thinkingLevel !== "off" ? values.thinkingLevel : undefined,
    seed: parseOptionalInteger(values.seed),
  };
}

function buildQwenInput(values: EditImageValues, prompt: string, imageUrl: string) {
  return compactInput({
    prompt,
    image_size: values.imageSize || "square_hd",
    num_inference_steps: parseInteger(values.numInferenceSteps, 30),
    seed: parseOptionalInteger(values.seed),
    guidance_scale: parseFloatWithFallback(values.guidanceScale, 4),
    sync_mode: false,
    num_images: parseInteger(values.numImages, 1),
    enable_safety_checker: values.enableSafetyChecker,
    output_format: values.outputFormat || "png",
    image_url: imageUrl,
    negative_prompt: values.negativePrompt,
    acceleration: values.acceleration || "regular",
    strength: parseOptionalFloat(values.strength) ?? 0.94,
  });
}
