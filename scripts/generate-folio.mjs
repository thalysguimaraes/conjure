import { fal } from "@fal-ai/client";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "tmp");
await import("node:fs/promises").then(({ mkdir }) => mkdir(outDir, { recursive: true }));

const key = process.env.FAL_KEY?.trim();
if (!key) {
  console.error("FAL_KEY is required.");
  process.exit(1);
}

fal.config({ credentials: key });

const PROMPT = [
  "A minimalist macOS application icon for an app called Folio.",
  "A single elegant geometric glyph centered on a flat solid background: a thin-line drawing of a folded paper page,",
  "shown as a rounded rectangle (the page) with one corner folded over, revealing the fold as a small triangle.",
  "The lines are precise, thin, vector-like, sharp clean edges.",
  "Monochromatic palette: a soft sage-cream glyph color #dadec5 on a deep graphite background color #1f2126, no other colors.",
  "Modern Apple SF Symbols aesthetic, sophisticated, refined, restrained.",
  "Perfectly square composition, the glyph occupies roughly 50% of the canvas, generous symmetric padding.",
  "No text, no letters, no words. Just the symbol.",
  "Sharp, crisp, vector-like rendering. High contrast.",
].join(" ");

console.log("Generating Folio symbol with Nano Banana 2 ...");

const result = await fal.subscribe("fal-ai/nano-banana-2", {
  input: {
    prompt: PROMPT,
    num_images: 1,
    aspect_ratio: "1:1",
    resolution: "2K",
    output_format: "png",
    safety_tolerance: "4",
  },
  logs: false,
  onQueueUpdate(update) {
    if (update && typeof update === "object" && "status" in update) console.log("status:", update.status);
  },
});

const url = result?.data?.images?.[0]?.url;
if (!url) {
  console.error("No image returned.");
  process.exit(1);
}

console.log("Downloading:", url);
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const buffer = new Uint8Array(await response.arrayBuffer());
const outPath = path.join(outDir, "folio-symbol.png");
await writeFile(outPath, buffer);
console.log("Wrote", outPath);
