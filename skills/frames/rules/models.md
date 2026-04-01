# AI Models

## Model categories

Use `list_models` to get the current list. Use `get_model_capabilities` for full specs. Below is a reference for common guidance.

### Text models
Used by `textAI` and `storyAI` nodes.

- **Google Gemini** models (various tiers — Flash Lite, Flash, Pro)
- Default is typically the fastest/cheapest Flash variant
- Use `list_models({ category: "text" })` to see what's available and enabled

**When to recommend**: Flash Lite for simple rewrites, Flash for general use, Pro for complex creative writing.

### Image models
Used by `imageAI` nodes.

- **Google Imagen** — high quality, fast
- **Kling** — alternative provider
- Use `list_models({ category: "image" })` for current options

**When to recommend**: Imagen for general use. Check model capabilities for aspect ratio and resolution support.

### Video models
Used by `videoAI` nodes. These are async — execution takes minutes.

- **Kling** models (various versions and quality tiers)
- Standard mode is faster/cheaper, Pro mode is higher quality
- Duration options: typically 5s or 10s
- Use `list_models({ category: "video" })` for current options

**When to recommend**: Latest Kling version in standard mode for speed, pro mode for quality. Always warn the user that video generation takes a few minutes.

### Voice models
Used by `voiceAI` nodes.

- **ElevenLabs** — high-quality text-to-speech
- Use `list_voices` to browse available voices with previews
- Key settings: `voiceId`, `stability`, `similarityBoost`

**When to recommend**: Let the user pick a voice from `list_voices` — accent and tone are personal preferences.

## Choosing models

When the user doesn't specify a model:
1. Use the default model for that category (marked `isDefault: true` in `list_models`)
2. If they mention quality preferences, check `get_model_capabilities` for the right tier
3. Mention which model you're using so they can change it

When the user asks about pricing:
1. Use `get_pricing` filtered by operation and model
2. Different models within the same category can have very different costs

## Prompt templates

AI nodes use prompt templates to guide their behavior. Templates are server-side — the node sends the template slug, and the server resolves it.

- Use `list_prompt_templates({ nodeType: "textAI" })` to see available templates
- Set `template: "custom"` + `customPrompt: "..."` for user-written prompts
- Templates are curated for specific use cases (scene description, script writing, etc.)

## Style templates

The `globalStyle` node broadcasts visual style to all AI nodes in the workflow (no connections needed).

- Use `list_style_templates` to browse options
- Set `style: "none"` for no style override
- Styles affect image and video generation prompts automatically
