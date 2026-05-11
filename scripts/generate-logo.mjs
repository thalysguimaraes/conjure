import { fal } from "@fal-ai/client";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const key = process.env.FAL_KEY?.trim();
if (!key) {
  console.error("FAL_KEY is required to generate the logo.");
  process.exit(1);
}

fal.config({ credentials: key });

const PROMPT = [
  "A minimalist macOS application icon for an app called Conjure.",
  "A single elegant four-pointed sparkle glyph centered on a flat solid background.",
  "The sparkle has thin precise geometric lines, slightly elongated vertical points, sharp clean edges, like a stylized twinkle or magical spark.",
  "Monochromatic palette: a single warm off-white glyph on a deep charcoal black background, no other colors.",
  "Modern Apple SF Symbols aesthetic, sophisticated, refined, restrained.",
  "Perfectly square composition, the glyph occupies roughly 55% of the canvas, with generous symmetric padding.",
  "No text, no letters, no words. Just the symbol.",
  "Sharp, crisp, vector-like rendering. High contrast.",
].join(" ");

console.log("Generating logo with Nano Banana 2 ...");

const result = await fal.subscribe("fal-ai/nano-banana-2", {
  input: {
    prompt: PROMPT,
    num_images: 1,
    aspect_ratio: "1:1",
    resolution: "2K",
    output_format: "png",
    safety_tolerance: "4",
  },
  logs: true,
  onQueueUpdate(update) {
    if (update && typeof update === "object" && "status" in update) {
      console.log("status:", update.status);
    }
  },
});

const url = result?.data?.images?.[0]?.url;
if (!url) {
  console.error("No image returned.");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("Downloading:", url);
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`Download failed: ${response.status} ${response.statusText}`);
}
const buffer = new Uint8Array(await response.arrayBuffer());
const outPath = path.join(repoRoot, "assets", "extension-icon.png");
await writeFile(outPath, buffer);
console.log("Wrote", outPath);
