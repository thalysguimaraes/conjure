export type Option = {
  title: string;
  value: string;
};

export type ImageCreateModel = {
  id: string;
  title: string;
  endpoint: string;
  description: string;
  aspectRatios: Option[];
  resolutions: Option[];
  defaultAspectRatio: string;
  defaultResolution: string;
  supportsThinking: boolean;
  defaultLimitGenerations: boolean;
};

export type ImageEditModel = ImageCreateModel & {
  inputMode: "single" | "multiple";
};

export type UpscaleModel = {
  id: "seedvr" | "topaz";
  title: string;
  endpoint: string;
  description: string;
};

export type VideoModel = {
  id: string;
  title: string;
  endpoint: string;
  description: string;
  inputMode: "text" | "image";
};

export const outputFormats: Option[] = [
  { title: "PNG", value: "png" },
  { title: "JPEG", value: "jpeg" },
  { title: "WebP", value: "webp" },
];

export const jpegPngFormats: Option[] = [
  { title: "JPEG", value: "jpeg" },
  { title: "PNG", value: "png" },
];

export const safetyTolerances: Option[] = ["1", "2", "3", "4", "5", "6"].map((value) => ({
  title: value,
  value,
}));

export const nanoBanana2AspectRatios: Option[] = [
  "auto",
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
  "4:1",
  "1:4",
  "8:1",
  "1:8",
].map((value) => ({ title: value, value }));

export const nanoBananaProAspectRatios: Option[] = [
  "auto",
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
].map((value) => ({ title: value, value }));

export const imageCreateModels: ImageCreateModel[] = [
  {
    id: "nano-banana-2",
    title: "Nano Banana 2",
    endpoint: "fal-ai/nano-banana-2",
    description: "Fast Gemini image generation with 0.5K-4K output, web grounding, and optional thinking.",
    aspectRatios: nanoBanana2AspectRatios,
    resolutions: ["0.5K", "1K", "2K", "4K"].map((value) => ({ title: value, value })),
    defaultAspectRatio: "auto",
    defaultResolution: "1K",
    supportsThinking: true,
    defaultLimitGenerations: true,
  },
  {
    id: "nano-banana-pro",
    title: "Nano Banana Pro",
    endpoint: "fal-ai/nano-banana-pro",
    description: "Higher reasoning image model for complex composition, realism, and typography.",
    aspectRatios: nanoBananaProAspectRatios,
    resolutions: ["1K", "2K", "4K"].map((value) => ({ title: value, value })),
    defaultAspectRatio: "1:1",
    defaultResolution: "1K",
    supportsThinking: false,
    defaultLimitGenerations: false,
  },
];

export const imageEditModels: ImageEditModel[] = [
  {
    ...imageCreateModels[0],
    id: "nano-banana-2-edit",
    title: "Nano Banana 2 Edit",
    endpoint: "fal-ai/nano-banana-2/edit",
    description: "Multi-reference prompt editing with Nano Banana 2. Supports several image inputs.",
    inputMode: "multiple",
  },
  {
    ...imageCreateModels[1],
    id: "nano-banana-pro-edit",
    title: "Nano Banana Pro Edit",
    endpoint: "fal-ai/nano-banana-pro/edit",
    description: "High-quality multi-reference editing for complex compositional changes.",
    inputMode: "multiple",
  },
  {
    id: "qwen-image-edit",
    title: "Qwen Image Edit",
    endpoint: "fal-ai/qwen-image-edit/image-to-image",
    description: "Single-image editing with strong text editing and structure preservation controls.",
    inputMode: "single",
    aspectRatios: [],
    resolutions: [],
    defaultAspectRatio: "auto",
    defaultResolution: "square_hd",
    supportsThinking: false,
    defaultLimitGenerations: false,
  },
];

export const imageSizes: Option[] = [
  { title: "Square HD", value: "square_hd" },
  { title: "Square", value: "square" },
  { title: "Portrait 4:3", value: "portrait_4_3" },
  { title: "Portrait 16:9", value: "portrait_16_9" },
  { title: "Landscape 4:3", value: "landscape_4_3" },
  { title: "Landscape 16:9", value: "landscape_16_9" },
];

export const accelerationLevels: Option[] = [
  { title: "Regular", value: "regular" },
  { title: "High", value: "high" },
  { title: "None", value: "none" },
];

export const upscaleModels: UpscaleModel[] = [
  {
    id: "seedvr",
    title: "SeedVR2 Upscale",
    endpoint: "fal-ai/seedvr/upscale/image",
    description: "Straight image upscaling by factor or target resolution with noise control.",
  },
  {
    id: "topaz",
    title: "Topaz Upscale",
    endpoint: "fal-ai/topaz/upscale/image",
    description: "Topaz enhancement models with face, sharpening, denoise, compression, and generative controls.",
  },
];

export const topazModels: Option[] = [
  "Standard V2",
  "Low Resolution V2",
  "CGI",
  "High Fidelity V2",
  "Text Refine",
  "Recovery",
  "Redefine",
  "Recovery V2",
  "Standard MAX",
  "Wonder",
].map((value) => ({ title: value, value }));

export const subjectDetectionModes: Option[] = ["All", "Foreground", "Background"].map((value) => ({
  title: value,
  value,
}));

export const videoModels: VideoModel[] = [
  {
    id: "seedance-2-text",
    title: "Seedance 2.0 Text to Video",
    endpoint: "bytedance/seedance-2.0/text-to-video",
    description: "Highest-quality Seedance 2.0 text-to-video with synchronized audio.",
    inputMode: "text",
  },
  {
    id: "seedance-2-fast-text",
    title: "Seedance 2.0 Fast Text to Video",
    endpoint: "bytedance/seedance-2.0/fast/text-to-video",
    description: "Lower-latency, lower-cost Seedance 2.0 text-to-video.",
    inputMode: "text",
  },
  {
    id: "seedance-2-image",
    title: "Seedance 2.0 Image to Video",
    endpoint: "bytedance/seedance-2.0/image-to-video",
    description: "Animate a start frame, optionally guiding the last frame.",
    inputMode: "image",
  },
  {
    id: "seedance-2-fast-image",
    title: "Seedance 2.0 Fast Image to Video",
    endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    description: "Fast image-to-video animation for iteration.",
    inputMode: "image",
  },
];

export const videoAspectRatios: Option[] = ["auto", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"].map((value) => ({
  title: value,
  value,
}));

export const videoDurations: Option[] = ["auto", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"].map(
  (value) => ({ title: value === "auto" ? "Auto" : `${value}s`, value }),
);

export const videoResolutions: Option[] = ["480p", "720p"].map((value) => ({ title: value, value }));

export function findOptionModel<T extends { id: string }>(models: T[], id: string): T {
  const model = models.find((candidate) => candidate.id === id);
  if (!model) {
    throw new Error(`Unsupported model: ${id}`);
  }
  return model;
}
