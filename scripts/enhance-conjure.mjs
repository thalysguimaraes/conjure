import { fal } from "@fal-ai/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const key = process.env.FAL_KEY?.trim();
if (!key) {
  console.error("FAL_KEY is required.");
  process.exit(1);
}

fal.config({ credentials: key });

const sourcePath = path.join(repoRoot, "assets", "extension-icon@source.png");
const bytes = await readFile(sourcePath);
const file = new File([new Uint8Array(bytes)], "extension-icon.png", { type: "image/png" });

console.log("Uploading source icon to fal storage ...");
const uploadedUrl = await fal.storage.upload(file);
console.log("Uploaded:", uploadedUrl);

console.log("Running background removal (birefnet) ...");
const result = await fal.subscribe("fal-ai/birefnet/v2", {
  input: {
    image_url: uploadedUrl,
    model: "General Use (Heavy)",
    output_format: "png",
  },
  logs: false,
  onQueueUpdate(update) {
    if (update && typeof update === "object" && "status" in update) console.log("status:", update.status);
  },
});

const outputUrl = result?.data?.image?.url;
if (!outputUrl) {
  console.error("No image returned:", JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("Downloading transparent result ...");
const response = await fetch(outputUrl);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const buffer = new Uint8Array(await response.arrayBuffer());
const outPath = path.join(repoRoot, "assets", "symbol.png");
await writeFile(outPath, buffer);
console.log("Wrote", outPath);
