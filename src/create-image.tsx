import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { findOptionModel, imageCreateModels, outputFormats, safetyTolerances, ImageCreateModel } from "./model-options";
import { OptionDropdown } from "./form-fields";
import { parseInteger, parseOptionalInteger, runFal, MediaFile } from "./fal";
import { ResultView } from "./result-view";

type CreateImageValues = {
  model: string;
  prompt: string;
  numImages: string;
  aspectRatio: string;
  outputFormat: string;
  safetyTolerance: string;
  resolution: string;
  limitGenerations: boolean;
  enableWebSearch: boolean;
  thinkingLevel: string;
  seed: string;
};

type ImageOutput = {
  images?: MediaFile[];
  description?: string;
};

export default function Command() {
  const [modelId, setModelId] = useState(imageCreateModels[0].id);
  const selectedModel = useMemo(() => findOptionModel(imageCreateModels, modelId), [modelId]);
  const { push } = useNavigation();

  async function handleSubmit(values: CreateImageValues) {
    try {
      const model = findOptionModel(imageCreateModels, values.model);
      const prompt = values.prompt.trim();
      if (!prompt) {
        await showToast({ style: Toast.Style.Failure, title: "Prompt is required" });
        return;
      }

      const input = buildImageInput(model, values, prompt);
      const result = await runFal<ImageOutput>(model.endpoint, input, "Creating image");

      push(
        <ResultView
          title="Created Image"
          commandType="create-image"
          mediaKind="image"
          modelTitle={model.title}
          endpoint={model.endpoint}
          requestId={result.requestId}
          prompt={prompt}
          media={result.data.images ?? []}
          output={result.data}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create image",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      enableDrafts
      navigationTitle="Create Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <OptionDropdown
        id="model"
        title="Model"
        options={imageCreateModels.map((model) => ({ title: model.title, value: model.id }))}
        value={modelId}
        onChange={setModelId}
        info={selectedModel.description}
        storeValue
      />
      <Form.Description title="Endpoint" text={selectedModel.endpoint} />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe the image, composition, mood, subject, style, and text to render."
        enableMarkdown={false}
      />

      <Form.Separator />
      <OptionDropdown
        id="aspectRatio"
        title="Aspect Ratio"
        options={selectedModel.aspectRatios}
        defaultValue={selectedModel.defaultAspectRatio}
        storeValue
      />
      <OptionDropdown
        id="resolution"
        title="Resolution"
        options={selectedModel.resolutions}
        defaultValue={selectedModel.defaultResolution}
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

      <Form.Separator />
      <Form.Checkbox
        id="limitGenerations"
        title="Generation"
        label="Limit intermediate generations to one final image per requested image"
        defaultValue={selectedModel.defaultLimitGenerations}
        storeValue
      />
      <Form.Checkbox id="enableWebSearch" title="Grounding" label="Enable web search" defaultValue={false} storeValue />
      {selectedModel.supportsThinking ? (
        <OptionDropdown
          id="thinkingLevel"
          title="Thinking"
          options={[
            { title: "Off", value: "off" },
            { title: "Minimal", value: "minimal" },
            { title: "High", value: "high" },
          ]}
          defaultValue="off"
          info="Nano Banana 2 only. Enables extra model thinking when selected."
          storeValue
        />
      ) : null}
      <Form.TextField id="seed" title="Seed" placeholder="Optional integer" storeValue />
    </Form>
  );
}

function buildImageInput(model: ImageCreateModel, values: CreateImageValues, prompt: string) {
  const numImages = parseInteger(values.numImages, 1);
  if (numImages < 1 || numImages > 4) {
    throw new Error("Images must be between 1 and 4.");
  }

  return {
    prompt,
    num_images: numImages,
    aspect_ratio: values.aspectRatio || model.defaultAspectRatio,
    output_format: values.outputFormat || "png",
    safety_tolerance: values.safetyTolerance || "4",
    sync_mode: false,
    resolution: values.resolution || model.defaultResolution,
    limit_generations: values.limitGenerations,
    enable_web_search: values.enableWebSearch,
    thinking_level: model.supportsThinking && values.thinkingLevel !== "off" ? values.thinkingLevel : undefined,
    seed: parseOptionalInteger(values.seed),
  };
}
