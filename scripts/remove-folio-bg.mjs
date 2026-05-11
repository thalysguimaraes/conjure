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

const sourcePath = path.join(repoRoot, "tmp", "folio-symbol.png");
const bytes = await readFile(sourcePath);
const file = new File([new Uint8Array(bytes)], "folio-symbol.png", { type: "image/png" });

console.log("Uploading Folio source ...");
const uploadedUrl = await fal.storage.upload(file);

console.log("Running background removal ...");
const result = await fal.subscribe("fal-ai/birefnet/v2", {
  input: {
    image_url: uploadedUrl,
    model: "General Use (Heavy)",
    output_format: "png",
  },
});

const outputUrl = result?.data?.image?.url;
if (!outputUrl) {
  console.error("No image returned:", JSON.stringify(result, null, 2));
  process.exit(1);
}

const response = await fetch(outputUrl);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const buffer = new Uint8Array(await response.arrayBuffer());
const outPath = path.join(repoRoot, "tmp", "folio-symbol-transparent.png");
await writeFile(outPath, buffer);
console.log("Wrote", outPath);
