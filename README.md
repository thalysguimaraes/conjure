<div align="center">
  <img src="assets/extension-icon.png" alt="Conjure" width="128" height="128" />

  # Conjure

  Conjure images, edits, upscales, and videos through [fal.ai](https://fal.ai) — directly from Raycast.

  <sub>Five commands. Local history. Auto-download. No CLI gymnastics.</sub>
</div>

---

## Commands

| Command | What it does |
| --- | --- |
| **Create Image** | Text-to-image with Nano Banana 2 / Nano Banana Pro |
| **Edit Image** | Single- or multi-reference image editing (Nano Banana edits, Qwen Image Edit) |
| **Upscale Image** | SeedVR2 or Topaz with model-specific controls (face enhance, denoise, generative redefine, …) |
| **Create Video** | Seedance 2.0 text-to-video and image-to-video, with optional end-frame guidance and synchronized audio |
| **Recent Generations** | Grid of your last 50 outputs with per-result open, download, copy URL, copy prompt |

## Install (local development)

Conjure isn't on the Raycast Store yet — it runs as a local development extension.

```bash
git clone https://github.com/thalysguimaraes/conjure.git
cd conjure
npm install
npm run dev
```

`npm run dev` runs `ray develop`, which registers the extension with Raycast and watches for changes. Keep the process running while you use the commands; quitting it unregisters the extension until you run it again.

## Configure your fal.ai key

You need a fal.ai API key. Grab one from [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys). The extension resolves the key in this order:

1. The **FAL API Key** preference in `Raycast → Settings → Extensions → Conjure`
2. The `FAL_KEY` environment variable

For frictionless local use, export it in your shell profile:

```bash
# ~/.zshrc or ~/.bashrc
export FAL_KEY="your-fal-key-here"
```

Then restart Raycast so it picks up the variable.

## Optional preferences

| Preference | Default | Notes |
| --- | --- | --- |
| Auto-Download | off | Saves every generated file to disk automatically |
| Download Folder | `~/Downloads/FAL AI` | Where downloads land |

## Keyboard shortcuts (result view)

| Shortcut | Action |
| --- | --- |
| `⌘D` | Download & open |
| `⌘⇧D` | Download & show in Finder |
| `⌘C` | Copy first result URL |
| `⌘⇧P` | Copy prompt |
| `⌘1`–`⌘4` | Open results 2–4 directly |

## Development

```bash
npm run dev         # ray develop with hot reload
npm run build       # ray build --skip-types
npm run lint        # ray lint
npm run typecheck   # tsc --noEmit
npm run fix-lint    # auto-fix lint + Prettier
```

The codebase:

```
src/
  fal.ts                  # fal client config, upload, download
  history.ts              # LocalStorage-backed generation history
  model-options.ts        # model + parameter catalog
  form-fields.tsx         # shared form components
  result-view.tsx         # detail view shown after every generation
  create-image.tsx        # text-to-image command
  edit-image.tsx          # image-to-image command
  upscale-image.tsx       # upscale command
  create-video.tsx        # video command
  recent-generations.tsx  # grid view of history
scripts/
  generate-logo.mjs       # regenerate the extension icon (reads FAL_KEY)
```

## Models

Conjure currently wraps these fal.ai endpoints:

- `fal-ai/nano-banana-2`, `fal-ai/nano-banana-pro` (+ `/edit`)
- `fal-ai/qwen-image-edit/image-to-image`
- `fal-ai/seedvr/upscale/image`
- `fal-ai/topaz/upscale/image`
- `bytedance/seedance-2.0/text-to-video` (+ `/fast`)
- `bytedance/seedance-2.0/image-to-video` (+ `/fast`)

Adding a new model is mostly a matter of extending `src/model-options.ts` and wiring the relevant form fields in the matching command.

## Contributing

Issues and PRs are welcome. A few notes:

- Keep `npm run lint` and `npm run typecheck` green before pushing.
- New commands should reuse `ResultView` so they automatically get history, downloads, and the standard action set.
- Don't commit secrets. `.env*` and `*.key` are gitignored — please leave it that way.

## License

[MIT](LICENSE) © Thalys Guimaraes

---

<sub>Conjure is an unofficial wrapper. Not affiliated with fal.ai or Raycast.</sub>
