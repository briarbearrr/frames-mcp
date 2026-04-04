# Best Practices

Follow these when building any workflow. They produce better results and avoid common mistakes.

## Before you build

### Plan before you build

Before jumping into `build_graph`, ask the user 2-3 targeted questions max to nail down the direction — platform (TikTok vs YouTube), aspect ratio, style (cinematic vs animated), voiceover or not. Don't interrogate — make smart defaults for anything the user didn't specify and only ask when genuinely ambiguous. A quick planning exchange prevents rebuilding the entire pipeline later.

### Always build the complete workflow first

Building a workflow is free — node placement and edge connections cost nothing. Always build the full pipeline with `build_graph` first, then present it to the user and ask: "Workflow is ready. Want me to run it step by step or all at once?" Never half-build a workflow to "validate the concept" — that just means rebuilding later.

### Never run immediately after building

**After building a workflow, STOP and present it to the user.** Share the workflow URL, describe what you built (nodes, connections, models chosen), and ask for confirmation before executing anything. Execution costs credits — the user must explicitly approve before any `run_node` or `run_workflow` call. Don't assume "build me X" means "build and run X". Building is free, running is not. This rule applies even when the agent has auto-approve or bypass-permissions enabled — always ask before spending credits.

### Execute in phases, not all at once

Once the user approves execution, run in phases — not all at once. Run the first segment (e.g., `textInput` → `textAI` → `imageAI`), verify the output looks right, then run the next segment (e.g., `videoAI`). Never rerun nodes that already produced good output — it wastes credits and time.

## Prompt crafting

### Separate motion from subject in video prompts

When writing or enriching prompts for video generation, describe the subject/scene separately from camera movement and action. Good: "A golden retriever on a beach at sunset. Camera slowly dollies forward as the dog runs toward the waves." Bad: "A golden retriever running on a beach at sunset with the camera moving forward." This is especially important with image-to-video where the start frame already defines the subject — the prompt should focus on what _changes_.

### Don't over-describe images

Keep image prompts focused on the key elements: subject, style, mood, and composition. Overly long prompts cause models to ignore or blend instructions unpredictably. Let `textAI` with a good prompt template craft a focused, structured prompt — don't stuff every detail into one sentence. Short, structured prompts with clear hierarchy outperform long rambling ones.

## Always enrich prompts

Never connect a `textInput` directly to `imageAI` or `videoAI`. Raw user text like "a cat playing piano" produces mediocre results. Always route through `textAI` first with an appropriate prompt template:

```
textInput → textAI (template: image/video prompt enricher) → imageAI → videoAI
```

The textAI node transforms "a cat playing piano" into a detailed, model-optimized prompt with lighting, composition, camera angle, and style details. This is the single biggest quality improvement.

Use `list_prompt_templates({ nodeType: "textAI" })` to find the right enrichment template. There are specific templates for image prompts vs video prompts — use the right one for the downstream node.

## Set maxOutputChars for downstream model limits

When Text AI feeds into Image AI, Video AI, or Voice AI, set its `maxOutputChars` to fit within the downstream model's prompt limit. Without this, execution fails with a cryptic "prompt too long" error.

Key limits:

- **Imagen 4**: ~1,400 chars — set `maxOutputChars: 1400` (very restrictive)
- **Kling image/video, Veo**: ~9,500 chars — default 2000 is safe
- **ElevenLabs voice**: ~4,500 chars for most models, ~39,500 for Flash v2.5

When Text AI connects to multiple downstream nodes, use the **lowest** limit. When `maxOutputChars` is 0 (unlimited), always set it when there's a downstream AI node.

See the [Models](models.md) doc for the full limits table.

## Use storyAI for multi-scene, textAI for single-scene

If the user wants a single image or video, use `textAI` to enrich the prompt. If they want multiple scenes (video series, story), use `storyAI` — it has 8 scene output handles (`scene_1` through `scene_8`), each producing a tailored prompt. Connect each scene to its own `imageAI` → `videoAI` chain. storyAI has modes like "multishot" and "continuous shot" to guide how it structures the scenes.

Don't try to make `textAI` output multiple scenes by hacking the prompt — storyAI handles scene splitting, pacing, and coherence natively. Multiple textAI nodes manually writing "scene 1", "scene 2" produces inconsistent tone and pacing.

## Generate a start frame for video

`videoAI` requires a text prompt and optionally accepts a start frame image. Providing a start frame produces significantly better results — it gives the model a clear visual anchor.

**Important**: The startFrame is literally the first frame of the generated video. Never use a raw product photo or unprocessed reference image as startFrame — the video will start with that exact image, which looks unnatural. Always route through `imageAI` first to generate a styled scene, then use that as the startFrame.

```
textAI → imageAI → videoAI (startFrame)                       (best — AI-generated scene)
imageInput → imageAI (reference) → videoAI (startFrame)        (product photo → styled scene → video)
textAI → videoAI                                               (works, but less visual control)
```

**Caution**: `imageInput → videoAI (startFrame)` makes the raw photo the literal first frame. This is valid when the user explicitly wants that (e.g., "animate this exact image"). For product/marketing use cases, ask first — default to routing through `imageAI` to generate a styled scene.

videoAI also accepts `endFrame`, `referenceImages`, and `videoReference` inputs depending on the model. Use `get_node_type_info({ nodeType: "videoAI" })` for full handle details.

## Iterate on images before generating video

Video generation is slow (1-4 minutes) and 10-50x more expensive than image generation. **Always get the image right first.** Run `imageAI`, review the result, and show it to the user before proceeding to `videoAI`. If the image doesn't look right, regenerate it — don't commit to a video run with a bad start frame.

The workflow is: generate image → show user → get confirmation → generate video. The agent should pause and ask "Does this look right before we generate the video?" — don't mechanically run the next node.

## Chain images for scene continuity

When building multi-scene workflows, connect the output of one `imageAI` as a reference input to the next `imageAI`. This ensures characters, style, and setting stay consistent across scenes:

```
storyAI (scene 1) → imageAI #1 → videoAI #1
                     ↓ (reference)
storyAI (scene 2) → imageAI #2 → videoAI #2
                     ↓ (reference)
storyAI (scene 3) → imageAI #3 → videoAI #3
```

Without image chaining, each scene may generate completely different-looking characters and environments. Also consider using `imageInput` with a reference photo of the character to anchor consistency.

## Voice reads the enriched script, not the raw input

Connect `voiceAI` to the output of `textAI` or `storyAI`, not directly to `textInput`. The AI-generated text is written for narration — proper pacing, sentence structure, and flow. Raw user input usually isn't.

```
textInput → textAI (script template) → voiceAI
```

## Don't connect voiceAI to videoAI

A common mistake: trying to connect `voiceAI` output to `videoAI`. Video generation doesn't accept audio input — it generates silent video from text + optional start frame. To combine voice with video, both feed into `videoCaptions`: `videoAI` → `videoCaptions` (video handle) + `voiceAI` → `videoCaptions` (audio handle). The captions node is where audio and video come together.

## Captions need both video and audio

`videoCaptions` requires both a `video` input and an `audio` input to generate accurate captions. The audio is what gets transcribed — without it, there's nothing to caption. Always connect `voiceAI` → `videoCaptions` (audio) alongside `videoAI` → `videoCaptions` (video).

## Match voice and video duration

**Video clips are 3-15 seconds each.** Any narration longer than ~15 seconds requires a multi-shot workflow — there is no single video node that produces a 1-minute clip.

Use ~2.5 words per second as a guideline:

| Video duration | Max narration |
|---------------|---------------|
| 5 seconds     | ~12 words     |
| 10 seconds    | ~25 words     |
| 15 seconds    | ~37 words     |

**Single-shot workflows** (one videoAI node): The narration textAI must have `maxOutputChars` set low enough to produce a short script matching the video duration. For a 5-second video ad, the script should be 1-2 punchy sentences — not a paragraph.

**Multi-shot workflows** (narration > 15 seconds): Use `storyAI` to split into scenes, each with its own `imageAI` → `videoAI` chain (3-15s per clip), then `videoMerge` to combine. A 60-second narration needs ~4-12 video clips. Never pair a long script with a single short video — it's unusable.

**Planning the duration budget**: Before building, estimate total narration length from the user's intent. If they want a "short ad" → 5-10s single shot. If they want a "product story" or "explainer" → multi-shot with storyAI. If unclear, ask: "How long should the final video be?" This determines the entire workflow shape.

Which asset leads depends on the user's intent: if they start with a script, the video count and duration should match the voice length. If they start with a video concept, constrain the narration to fit the video duration.

## Use globalStyle for visual consistency

When a workflow generates 2 or more images or videos, add a `globalStyle` node to the workflow. It broadcasts style to all AI nodes automatically via the system — no edge connections needed. Just add the node and set its `style` field to a template slug from `list_style_templates`.

Without globalStyle, each generation may have a different visual look. When a workflow has multiple imageAI or videoAI nodes, use consistent style descriptors across all of them. globalStyle is the best mechanism for this, but even without it, keep phrasing consistent (e.g., always "cinematic, warm lighting, 35mm film grain" — not "warm tones" in one node and "golden hour lighting" in another). Intentional style variation across nodes is fine when the user wants it — this is about avoiding _accidental_ inconsistency.

## Use research nodes for brand context

`websiteResearch` scrapes a website into a text document. `tiktokResearch` does the same for TikTok videos — analyzing hooks, content structure, and style.

`websiteResearch` outputs multiple handles — use each where it helps most:

- `brandDocument` → `textAI` for tone-aware prompt enrichment
- `screenshots` → `imageAI` as a visual reference for brand-consistent imagery
- `colorPalette` → `textAI` for style-aware generation with brand colors

Don't just connect `brandDocument` to everything — each output serves a different purpose.

```
websiteResearch ──brandDocument──→ textAI (brand-aware prompt enrichment) → imageAI
                ──screenshots───→ imageAI (reference image)
tiktokResearch ──content──→ textAI (hook-style prompt) → videoAI
```

## Execution

### Check outputs before continuing downstream

After running a node, use `get_node_outputs` to review what was produced before running the next node in the chain. This is the agent's responsibility — check internally and only flag issues to the user. If the output looks fine, keep going without asking. Don't force the user to review every step. But if something looks off (wrong style, garbled text, bad composition), stop and surface it before wasting credits downstream.

### Run nodes individually when iterating

Prefer running nodes one at a time with `run_node` over `run_workflow` when the user is iterating. This gives control over each step — they can review and regenerate individual nodes without re-running the entire pipeline. Only use `run_workflow` for final production runs of a validated workflow.

### Only rerun the node that needs fixing

When the user asks to "fix" or "improve" a result (e.g., "the image is too dark", "change the narration tone"), only update and rerun the specific node that needs changing. Don't rerun the whole workflow — upstream nodes that produced good output don't need to be touched. Update the node's data if needed, then `run_node` on just that node.

### Check credits before video generation

Video is expensive. Call `get_credit_balance` and `get_pricing({ operation: "video-generation" })` before running videoAI nodes. Tell the user the cost and ask for confirmation.

## Workflow hygiene

### Name nodes descriptively

Give nodes clear labels that describe their purpose — "Scene Description Enricher" instead of "Text AI 1", "Product Hero Shot" instead of "Image AI 2". Set the `label` field via `build_graph` dataUpdates or `update_node_data`. Descriptive names make workflows readable when the user comes back later and help the agent understand existing workflows.

### Duplicate workflows to experiment

When a workflow is producing decent results and the user wants to try variations (different model, style, or prompt approach), duplicate it first with `duplicate_workflow`. Never experiment on a working workflow — duplication is free, regeneration is not.

### Keep node count intentional

Don't chain three `textAI` nodes to refine a prompt when one with a good template and clear instructions can do the job. Every extra node adds latency, cost, and a point of failure. Add nodes only when they serve a distinct purpose (e.g., separate enrichment for video prompt vs narration script).

### Use gate nodes for optional branches

When building a workflow that might be used with or without certain features (e.g., voiceover, captions), use `gate` nodes to toggle branches on/off. This lets one workflow serve multiple use cases instead of building separate workflows for each variation.

### Video merge order matters

When using `videoMerge`, the order of input connections determines the final video sequence. Connect videos in narrative order — scene 1 first, scene 2 second, etc. If the order is wrong, the story won't make sense and you'll have to re-merge.

### Update inputs after duplicating

After `duplicate_workflow`, always review and update the input nodes (`textInput`, `imageInput`, `videoInput`) with the new content before running. A duplicated workflow still has the old inputs baked in.

## Use build_graph over individual calls

Use `build_graph` for new workflows (atomic, supports `tempId`). Use individual `add_node`/`connect_nodes` only for incremental edits.

## Check prompt templates first

Always call `list_prompt_templates` and check if a built-in template fits the use case — they're tuned for each model's quirks and produce better results than ad-hoc prompts. If no template fits the specific use case, the agent can write a custom prompt (`promptTemplate: "custom"` + `customPrompt`). But check templates first — don't default to custom.

## Validate before sharing

Always `validate_workflow` after building. Fix issues before telling the user it's ready.
