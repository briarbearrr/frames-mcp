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
- **Veo** (Google) models — some have built-in audio
- Standard mode is faster/cheaper, Pro mode is higher quality
- Duration range is model-dependent (3–15s) — call `get_model_capabilities` to check supported durations
- **Not all models/modes accept image inputs (startFrame)**. Always call `get_model_capabilities` before connecting `imageAI → videoAI`. If the model doesn't support `startFrame`, either pick a different model/mode or skip the image-to-video connection.
- **Capabilities can be mode-dependent**. The static `inputs.startFrame: true` flag means the model _can_ support it — but actual availability may depend on `mode`/`resolution`. Check `constraintSummary` in the `get_model_capabilities` response. Example: **Kling v2.5 Turbo** only supports start/end frames in **PRO mode (1080p)** — at standard resolution they're disabled.
- Use `list_models({ category: "video" })` for current options

**When to recommend**: Latest Kling version in pro mode when using start frames. Veo for built-in audio. Always warn the user that video generation takes a few minutes.

### Voice models

Used by `voiceAI` nodes.

- **ElevenLabs** — high-quality text-to-speech
- Use `list_voices` to browse available voices with previews
- Key settings: `presetVoiceId` (voice ID from `list_voices`), `stability`, `similarityBoost`

**When to recommend**: Let the user pick a voice from `list_voices` — accent and tone are personal preferences.

## Prompt length limits

Each downstream AI model has a maximum prompt/text input size. When Text AI output feeds into another AI node, the output must fit within that model's limit — otherwise execution fails.

### Limits by category

| Category | Model                | Token limit   | Effective char limit |
| -------- | -------------------- | ------------- | -------------------- |
| Image    | Imagen 4 (all tiers) | 480 tokens    | ~1,400 chars         |
| Image    | Nanobanana           | 32,768 tokens | ~130,500 chars       |
| Image    | Nanobanana Pro       | 65,536 tokens | ~261,600 chars       |
| Image    | Kling (all)          | 2,500 tokens  | ~9,500 chars         |
| Video    | All models           | 2,500 tokens  | ~9,500 chars         |
| Voice    | Most ElevenLabs      | 5,000 chars   | ~4,500 chars         |
| Voice    | Flash v2.5           | 40,000 chars  | ~39,500 chars        |

_Effective limit = raw limit minus ~500 chars for system prompt overhead. Conversion: ~4 chars per token._

### Setting maxOutputChars on Text AI

When connecting Text AI to a downstream AI node, **always** set `maxOutputChars` based on the downstream model's limit:

1. Check the downstream model's limit via `get_model_capabilities`
2. Set `maxOutputChars` to the effective char limit from the table above
3. When feeding multiple downstream nodes, use the **lowest** limit

**Critical**: Imagen 4 has a very low limit (~1,400 chars). When Text AI feeds Imagen 4, set `maxOutputChars: 1400`.

Video models and Kling image models accept up to ~9,500 chars — the default `maxOutputChars: 2000` is safe. Voice models accept ~4,500 chars for most models.

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
- Set `promptTemplate: "custom"` + `customPrompt: "..."` for user-written prompts
- Templates are curated for specific use cases (scene description, script writing, etc.)

## Style templates

The `globalStyle` node applies visual style templates across connected AI nodes.

- Use `list_style_templates` to browse options
- Set `style: "none"` for no style override
- Styles affect image and video generation prompts automatically
