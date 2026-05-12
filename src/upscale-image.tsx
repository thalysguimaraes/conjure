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
import { findOptionModel, jpegPngFormats, subjectDetectionModes, topazModels, upscaleModels } from "./model-options";
import { OptionDropdown } from "./form-fields";
import {
  collectSingleMediaUrl,
  MediaFile,
  parseFloatWithFallback,
  parseOptionalFloat,
  parseOptionalInteger,
} from "./fal";
import { inputDirectory, runJob } from "./jobs";

type UpscaleValues = {
  model: string;
  imageFiles: string[];
  imageUrl: string;
  upscaleMode: string;
  upscaleFactor: string;
  targetResolution: string;
  noiseScale: string;
  outputFormat: string;
  seed: string;
  topazModel: string;
  cropToFill: boolean;
  subjectDetection: string;
  faceEnhancement: boolean;
  faceEnhancementCreativity: string;
  faceEnhancementStrength: string;
  sharpen: string;
  denoise: string;
  fixCompression: string;
  textRefineStrength: string;
  creativity: string;
  texture: string;
  prompt: string;
  autoprompt: boolean;
  detail: string;
};

type UpscaleOutput = {
  image?: MediaFile;
  seed?: number;
};

export type UpscaleJobContext = {
  command: "upscale-image";
  modelId: string;
  values: UpscaleValues;
};

const seedvrOutputFormats = [
  { title: "JPG", value: "jpg" },
  { title: "PNG", value: "png" },
  { title: "WebP", value: "webp" },
];

export default function Command() {
  const [modelId, setModelId] = useState(upscaleModels[0].id);
  const [upscaleMode, setUpscaleMode] = useState("factor");
  const [topazModel, setTopazModel] = useState("Standard V2");
  const selectedModel = useMemo(() => findOptionModel(upscaleModels, modelId), [modelId]);

  async function handleSubmit(values: UpscaleValues) {
    const hasFile = (values.imageFiles?.length ?? 0) > 0;
    const hasUrl = (values.imageUrl?.trim()?.length ?? 0) > 0;
    if (!hasFile && !hasUrl) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a local file or provide a URL" });
      return;
    }

    const context: UpscaleJobContext = {
      command: "upscale-image",
      modelId: values.model,
      values,
    };

    await launchCommand({ name: "worker", type: LaunchType.Background, context });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  return (
    <Form
      enableDrafts
      navigationTitle="Upscale Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upscale Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <OptionDropdown
        id="model"
        title="Model"
        options={upscaleModels.map((model) => ({ title: model.title, value: model.id }))}
        value={modelId}
        onChange={(value) => setModelId(value as "seedvr" | "topaz")}
        info={selectedModel.description}
        storeValue
      />
      <Form.Description title="Endpoint" text={selectedModel.endpoint} />
      <Form.FilePicker
        id="imageFiles"
        title="Input Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.TextField
        id="imageUrl"
        title="Image URL"
        placeholder="Optional URL if you do not choose a file"
        storeValue
      />

      <Form.Separator />
      {selectedModel.id === "seedvr" ? (
        <SeedVrFields upscaleMode={upscaleMode} onUpscaleModeChange={setUpscaleMode} />
      ) : (
        <TopazFields topazModel={topazModel} onTopazModelChange={setTopazModel} />
      )}
    </Form>
  );
}

function SeedVrFields({
  upscaleMode,
  onUpscaleModeChange,
}: {
  upscaleMode: string;
  onUpscaleModeChange: (value: string) => void;
}) {
  return (
    <>
      <OptionDropdown
        id="upscaleMode"
        title="Mode"
        value={upscaleMode}
        onChange={onUpscaleModeChange}
        options={[
          { title: "Scale Factor", value: "factor" },
          { title: "Target Resolution", value: "target" },
        ]}
        storeValue
      />
      {upscaleMode === "factor" ? (
        <Form.TextField id="upscaleFactor" title="Factor" defaultValue="2" placeholder="2" storeValue />
      ) : (
        <OptionDropdown
          id="targetResolution"
          title="Target"
          options={["720p", "1080p", "1440p", "2160p"].map((value) => ({ title: value, value }))}
          defaultValue="1080p"
          storeValue
        />
      )}
      <Form.TextField id="noiseScale" title="Noise Scale" defaultValue="0.1" placeholder="0.1" storeValue />
      <OptionDropdown id="outputFormat" title="Format" options={seedvrOutputFormats} defaultValue="jpg" storeValue />
      <Form.TextField id="seed" title="Seed" placeholder="Optional integer" storeValue />
    </>
  );
}

function TopazFields({
  topazModel,
  onTopazModelChange,
}: {
  topazModel: string;
  onTopazModelChange: (value: string) => void;
}) {
  return (
    <>
      <OptionDropdown
        id="topazModel"
        title="Topaz Model"
        options={topazModels}
        value={topazModel}
        onChange={onTopazModelChange}
        storeValue
      />
      <Form.TextField id="upscaleFactor" title="Factor" defaultValue="2" placeholder="1-4" storeValue />
      <Form.Checkbox id="cropToFill" title="Crop" label="Crop to fill" defaultValue={false} storeValue />
      <OptionDropdown id="outputFormat" title="Format" options={jpegPngFormats} defaultValue="jpeg" storeValue />

      {topazModel !== "Redefine" ? (
        <>
          <OptionDropdown
            id="subjectDetection"
            title="Subject"
            options={subjectDetectionModes}
            defaultValue="All"
            info="Used by standard enhance and Recovery V2 models."
            storeValue
          />
          <Form.Checkbox id="faceEnhancement" title="Faces" label="Enable face enhancement" defaultValue storeValue />
          <Form.TextField
            id="faceEnhancementCreativity"
            title="Face Creativity"
            defaultValue="0"
            placeholder="0-1"
            storeValue
          />
          <Form.TextField
            id="faceEnhancementStrength"
            title="Face Strength"
            defaultValue="0.8"
            placeholder="0-1"
            storeValue
          />
        </>
      ) : null}

      {["Standard V2", "Low Resolution V2", "CGI", "High Fidelity V2", "Text Refine", "Redefine"].includes(
        topazModel,
      ) ? (
        <>
          <Form.TextField id="sharpen" title="Sharpen" placeholder="Optional 0-1" storeValue />
          <Form.TextField id="denoise" title="Denoise" placeholder="Optional 0-1" storeValue />
        </>
      ) : null}

      {["Standard V2", "Low Resolution V2", "High Fidelity V2", "Text Refine"].includes(topazModel) ? (
        <Form.TextField id="fixCompression" title="Fix Compression" placeholder="Optional 0-1" storeValue />
      ) : null}

      {topazModel === "Text Refine" ? (
        <Form.TextField id="textRefineStrength" title="Text Refine Strength" placeholder="Optional 0.01-1" storeValue />
      ) : null}

      {topazModel === "Redefine" ? (
        <>
          <Form.TextArea
            id="prompt"
            title="Prompt"
            placeholder="Optional prompt to guide generative upscaling"
            enableMarkdown={false}
          />
          <Form.Checkbox id="autoprompt" title="Prompt" label="Enable auto prompt" defaultValue={false} storeValue />
          <Form.TextField id="creativity" title="Creativity" placeholder="Optional 1-6" storeValue />
          <Form.TextField id="texture" title="Texture" placeholder="Optional 1-5" storeValue />
        </>
      ) : null}

      {topazModel === "Recovery V2" ? (
        <Form.TextField id="detail" title="Detail Recovery" placeholder="Optional 0-1" storeValue />
      ) : null}
    </>
  );
}

export async function runUpscaleFromContext(ctx: UpscaleJobContext): Promise<void> {
  const model = findOptionModel(upscaleModels, ctx.modelId);
  await runJob<UpscaleOutput>({
    label: "Upscale",
    commandType: "upscale-image",
    mediaKind: "image",
    modelTitle: model.title,
    endpoint: model.endpoint,
    outputDirectory: inputDirectory(ctx.values.imageFiles),
    prepare: async () => {
      const imageUrl = await collectSingleMediaUrl(ctx.values.imageFiles, ctx.values.imageUrl);
      const input =
        model.id === "seedvr" ? buildSeedVrInput(ctx.values, imageUrl) : buildTopazInput(ctx.values, imageUrl);
      return { input };
    },
    extractMedia: (data) => (data.image ? [data.image] : []),
  });
}

function buildSeedVrInput(values: UpscaleValues, imageUrl: string) {
  return {
    image_url: imageUrl,
    upscale_mode: values.upscaleMode || "factor",
    upscale_factor: values.upscaleMode === "factor" ? parseFloatWithFallback(values.upscaleFactor, 2) : undefined,
    target_resolution: values.upscaleMode === "target" ? values.targetResolution || "1080p" : undefined,
    seed: parseOptionalInteger(values.seed),
    noise_scale: parseFloatWithFallback(values.noiseScale, 0.1),
    output_format: values.outputFormat || "jpg",
    sync_mode: false,
  };
}

function buildTopazInput(values: UpscaleValues, imageUrl: string) {
  const model = values.topazModel || "Standard V2";
  const input: Record<string, unknown> = {
    model,
    upscale_factor: parseFloatWithFallback(values.upscaleFactor, 2),
    crop_to_fill: values.cropToFill,
    image_url: imageUrl,
    output_format: values.outputFormat || "jpeg",
  };

  if (model !== "Redefine") {
    input.subject_detection = values.subjectDetection || "All";
    input.face_enhancement = values.faceEnhancement;
    input.face_enhancement_creativity = parseFloatWithFallback(values.faceEnhancementCreativity, 0);
    input.face_enhancement_strength = parseFloatWithFallback(values.faceEnhancementStrength, 0.8);
  }

  if (["Standard V2", "Low Resolution V2", "CGI", "High Fidelity V2", "Text Refine", "Redefine"].includes(model)) {
    input.sharpen = parseOptionalFloat(values.sharpen);
    input.denoise = parseOptionalFloat(values.denoise);
  }

  if (["Standard V2", "Low Resolution V2", "High Fidelity V2", "Text Refine"].includes(model)) {
    input.fix_compression = parseOptionalFloat(values.fixCompression);
  }

  if (model === "Text Refine") {
    input.strength = parseOptionalFloat(values.textRefineStrength);
  }

  if (model === "Redefine") {
    input.prompt = values.prompt;
    input.autoprompt = values.autoprompt;
    input.creativity = parseOptionalInteger(values.creativity);
    input.texture = parseOptionalInteger(values.texture);
  }

  if (model === "Recovery V2") {
    input.detail = parseOptionalFloat(values.detail);
  }

  return input;
}
