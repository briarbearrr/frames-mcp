# Best Practices

Follow these when building any workflow. They produce better results and avoid common mistakes.

## Before you build

### Plan before you build

Before jumping into `build_graph`, ask the user 2-3 targeted questions max to nail down the direction — platform (TikTok vs YouTube), aspect ratio, style (cinematic vs animated), voiceover or not. Don't interrogate — make smart defaults for anything the user didn't specify and only ask when genuinely ambiguous. A quick planning exchange prevents rebuilding the entire pipeline later.

### Always build the complete workflow first

Building a workflow is free — node placement and edge connections cost nothing. Always build the full pipeline with `build_graph` first, then present it to the user. Never half-build a workflow to "validate the concept" — that just means rebuilding later.

### Never run immediately after building

**After building a workflow, STOP and present it to the user.** Share the workflow URL, describe what you built (nodes, connections, models chosen), and ask for confirmation before executing anything. Execution costs credits — the user must explicitly approve before any `run_node` or `run_workflow` call. Don't assume "build me X" means "build and run X". Building is free, running is not. This rule applies even when the agent has auto-approve or bypass-permissions enabled — always ask before spending credits.

### Execute in batches, not one-by-one

Once the user approves execution, run nodes in **dependency-ordered batches** using `run_node`. Group cheap/fast nodes (textAI, storyAI, voiceAI) into a single batch — run them all, then present the combined results. Only pause and ask for approval **before expensive nodes** (imageAI, videoAI) or at natural review points.

**Batch strategy:**

1. Run all text/story/voice nodes in one pass (they're fast and cheap)
2. Present the text outputs — let the user review scripts/prompts
3. After approval, run all imageAI nodes in one pass
4. Present the images — let the user review before committing to video
5. After approval, run videoAI nodes

Never rerun nodes that already produced good output — it wastes credits and time. Never run the full workflow with `run_workflow` unless explicitly asked.

## Generate concepts from images

When the user provides an image and wants text generated from it (ad concepts, descriptions, scene ideas), connect the image directly to `textAI`'s image input handle. Text input is optional when an image is connected -- the prompt template and image are sufficient.

```
imageInput → textAI (image handle connected, promptTemplate: "custom", customPrompt: "Describe this product and create an ad concept")
```

This pattern is useful for:

- Generating ad copy from a product photo
- Creating scene descriptions from reference images
- Extracting visual details for downstream prompt enrichment

Set `additionalInstructions` to control the output format and length. The textAI node will analyze the image and generate text based on the prompt template and any connected text input.

## Ground everything in user-provided inputs — never hallucinate details

**This is critical.** When the user provides images, text, documents, brand URLs, or any reference material, all generated content must be grounded in those inputs. Never invent brand names, product models, company slogans, visual details, or any specific claims that aren't present in the user's inputs.

- **Images provided?** Connect them as reference images to every AI node that accepts them (`storyAI`, `imageAI`). Describe what's visible in the image — don't guess what brand or model it is.
- **Text/documents provided?** Extract brand names, product details, and claims only from that text. Don't supplement with invented marketing copy.
- **Website URL provided?** Use `websiteResearch` to scrape actual brand info. Connect `brandDocument` to text nodes and `screenshots` to image nodes. Use the real brand voice, not a generic one.
- **Nothing provided about the brand?** Use generic, descriptive language ("the product", "the device", "the item shown"). Never fill gaps with made-up brand names, model numbers, pricing, or features.

**When writing prompts for textAI/storyAI**: If the user hasn't specified a brand, write "a premium wireless headphone" — not "Sony WH-1000XM5". If they provided a photo, write "the headphone shown in the reference image" — don't guess the brand from the image. Let the AI models work with visual references rather than hallucinated text descriptions.

**When generating scene descriptions from images**: Always include `additionalInstructions` telling the model to describe what it sees rather than guessing brand/model names. Example: "Describe the product shown in the reference image. Do not guess the brand name or model number — use generic descriptors like 'the smartphone' or 'the device'." Without this constraint, image models tend to hallucinate specific brand identities from visual cues, producing inaccurate marketing copy.

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

## Always connect reference images to storyAI

`storyAI` accepts a `Reference Image` input handle (`image`). **When the workflow has an `imageInput` node, always connect it to `storyAI`'s image input** — this lets the model see the actual product/subject instead of guessing. Without a reference image, storyAI tends to hallucinate specific brand names, model numbers, or visual details it can't know. The reference image grounds the scene descriptions in reality.

```
imageInput → storyAI (image handle)    ← always connect when imageInput exists
textInput  → storyAI (text handle)
```

This also applies when `websiteResearch` provides screenshots — connect them to `storyAI`'s image input for brand-aware scene generation.

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

## Seamless looping video

For ambient/background videos that need to loop cleanly (hero sections, auth page backgrounds, product b-roll), the last frame must match the first frame — otherwise the loop point is a visible jump cut.

**Trick**: connect the **same `imageAI` output to both `startFrame` AND `endFrame`** on the videoAI node. The model will plan a cyclical motion that begins and ends at that exact frame.

```
                       ┌─ startFrame ─┐
textAI → imageAI ──────┤              ├──→ videoAI  (seamless loop)
                       └── endFrame ──┘
```

Prompt for the videoAI should describe **cyclical motion** so the model has something to interpolate: "slowly drifts up and returns", "gently pulses in and out", "orbits once and settles back". Avoid directional prompts ("pushes forward", "flies past") that can't naturally return to the start.

Models that support this: Veo 3.1 (fast + standard), Kling V2.5+, Kling O1, Kling V3, Kling V3 Omni. Check `inputs.endFrame: true` via `get_model_capabilities` before attempting.

**When NOT to do this**: if the user wants a one-shot narrative clip (establishing shot, scene beat), don't force a loop — the cyclical constraint compromises pacing. Only use this technique for intentionally-ambient footage.

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
| -------------- | ------------- |
| 5 seconds      | ~12 words     |
| 10 seconds     | ~25 words     |
| 15 seconds     | ~37 words     |

**Single-shot workflows** (one videoAI node): The narration textAI must have `maxOutputChars` set low enough to produce a short script matching the video duration. For a 5-second video ad, the script should be 1-2 punchy sentences — not a paragraph. Always set `additionalInstructions` on narration textAI nodes to constrain output length. For a 5-second scene: "Write exactly 12 words of narration." For 15 seconds total across 3 scenes, constrain each scene's textAI to ~12 words. Without explicit length constraints, the prompt template will produce paragraph-length output that far exceeds the video duration.

**Multi-shot workflows** (narration > 15 seconds): Use `storyAI` to split into scenes, each with its own `imageAI` → `videoAI` chain (3-15s per clip), then `videoMerge` to combine. A 60-second narration needs ~4-12 video clips. Never pair a long script with a single short video — it's unusable.

**Planning the duration budget**: Before building, estimate total narration length from the user's intent. If they want a "short ad" → 5-10s single shot. If they want a "product story" or "explainer" → multi-shot with storyAI. If unclear, ask: "How long should the final video be?" This determines the entire workflow shape.

Which asset leads depends on the user's intent: if they start with a script, the video count and duration should match the voice length. If they start with a video concept, constrain the narration to fit the video duration.

## Per-scene timing budget (critical for sync)

When the user specifies a total duration, **divide it equally across scenes** and enforce that budget on BOTH video and audio per scene. Every scene's video clip duration and narration length must match so audio and visuals stay synchronized.

**Example**: User says "15 second video with 3 scenes":

- Each scene = 5 seconds
- Each video clip: set `duration: 5` on each `videoAI` node
- Each narration chunk: ~12 words per scene (5s × 2.5 words/s)
- Each `voiceAI` produces ~5 seconds of audio matching its scene's video

**How to implement**:

1. **Divide duration**: `total_duration / scene_count` = per-scene seconds
2. **Set videoAI duration**: Each `videoAI` node gets `duration` set to the per-scene value (must be within model's supported range — check `get_model_capabilities`)
3. **Constrain narration per scene**: Each narration `textAI` node's `customPrompt` or prompt template must instruct the LLM to write exactly N words for that scene's audio. Include the timing constraint explicitly: "Write exactly 12 words of narration for this 5-second scene."
4. **One voiceAI per scene**: In multi-shot workflows, use a separate `voiceAI` node per scene so each audio clip matches its video clip duration. Then feed each `videoAI` + `voiceAI` pair into its own `videoCaptions` node before merging.
5. **Merge in order**: `videoMerge` combines the captioned clips in scene order

**Multi-shot with per-scene audio sync**:

```
textInput → storyAI ──scene_1──→ textAI #1 (narration, ~12 words) → voiceAI #1 ──→ videoCaptions #1 ──→ videoMerge
                │                                                                         ↑
                │                 textAI #2 (video prompt) → imageAI #1 → videoAI #1 (5s) ┘
                │
                ├──scene_2──→ textAI #3 (narration, ~12 words) → voiceAI #2 ──→ videoCaptions #2 ──→ (videoMerge)
                │                                                                         ↑
                │                 textAI #4 (video prompt) → imageAI #2 → videoAI #2 (5s) ┘
                │
                └──scene_3──→ textAI #5 (narration, ~12 words) → voiceAI #3 ──→ videoCaptions #3 ──→ (videoMerge)
                                                                                          ↑
                              textAI #6 (video prompt) → imageAI #3 → videoAI #3 (5s) ────┘
```

**Key rule**: Never generate one long narration and pair it with multiple short video clips — the audio won't align with what's shown on screen. Each scene's narration must describe what happens in THAT scene's video, and both must be the same duration.

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

## Use audioOverlay to combine video + audio

When a workflow has separate video and audio tracks that need to be combined (e.g., `videoAI` output + `voiceAI` output), use `audioOverlay` instead of `videoCaptions`. `videoCaptions` is for adding captions WITH audio — `audioOverlay` is for merging audio onto video without captions.

**When to use audioOverlay:**

- User wants voiceover on a video but no captions
- User has a video clip and a separate music/audio track to combine
- Any "add audio to video" scenario where captions aren't needed

**When to use videoCaptions instead:**

- User wants captions displayed on the video (with or without audio)

```
voiceAI ──audio──→ audioOverlay ──video──→ (output with audio)
videoAI ──video──→ audioOverlay
```

**audioMode options:**

- `replace` (default) — replaces the video's original audio entirely with the provided audio
- `mix` — mixes both audio tracks together (useful for background music + voiceover)

## Execution

Execution behavior (tier-based batching, approval gates, cost checks) is enforced by the `run_node` tool responses — follow the `_agentInstructions` field in each response. See [execution.md](execution.md) for reference.

Key points not covered by tool responses:

- **Only rerun what needs fixing**: When iterating, `run_node` on the specific node — don't rerun the whole pipeline.
- **Check outputs internally**: After running a node, review the output before continuing downstream. Only flag issues to the user if something looks off.

## Workflow hygiene

### Workflow name rules

Workflow names must match `^[a-zA-Z0-9\s\-_()'.!?,&]+$` and be **50 characters or less**. Allowed: letters, numbers, spaces, and `- _ ( ) ' . ! ? , &`. Anything else (`:` `/` `\` `[` `]` `|` `#` `@` `*` emojis, etc.) returns a `VALIDATION_ERROR`.

Common mistakes that break:

- Colons: "Demo: Brand Video" → use "Demo - Brand Video"
- Slashes: "Marketing/Social" → use "Marketing - Social"
- Emojis, hashtags, pipes, brackets

When creating or renaming workflows via `create_workflow` / `rename_workflow`, sanitize the name first. If a user-suggested name contains disallowed characters, pick the closest safe substitute silently (don't ask — just do it and mention the swap in your summary).

### Name nodes descriptively

Give nodes clear labels that describe their purpose — "Scene Description Enricher" instead of "Text AI 1", "Product Hero Shot" instead of "Image AI 2". Set the `label` field via `build_graph` with `dataUpdates`. Descriptive names make workflows readable when the user comes back later and help the agent understand existing workflows.

### Duplicate workflows to experiment

When a workflow is producing decent results and the user wants to try variations (different model, style, or prompt approach), duplicate it first with `duplicate_workflow`. Never experiment on a working workflow — duplication is free, regeneration is not.

### Keep node count intentional

Don't chain three `textAI` nodes to refine a prompt when one with a good template and clear instructions can do the job. Every extra node adds latency, cost, and a point of failure. Add nodes only when they serve a distinct purpose (e.g., separate enrichment for video prompt vs narration script).

### Use gate nodes for human-in-the-loop candidate selection

Insert a `gate` node between a generator (`imageAI`, `videoAI`, `storyAI`, etc.) and its downstream consumer when the user should pick from multiple generated candidates before the pipeline commits to the expensive next step. Classic placement: `imageAI → gate → videoAI` — the user regenerates images until one looks right, picks it in the gate, and only then does the pipeline burn credits on video.

Gate does NOT toggle branches on/off — it is a pass-through selector with one `any` input and one `any` output. It accumulates candidates across runs (set `maxCandidates: 'accumulate'` — the default), the user pins one via the UI, and downstream nodes resolve to the pinned candidate.

Always set `productLabel` (user-facing text on product pages) and `productName` (semantic slug) when the workflow will be published — without them, custom product pages can't address the gate by name and the default page shows a generic "Gate" label.

### Video merge order matters

When using `videoMerge`, the order of input connections determines the final video sequence. Connect videos in narrative order — scene 1 first, scene 2 second, etc. If the order is wrong, the story won't make sense and you'll have to re-merge.

### Update inputs after duplicating

After `duplicate_workflow`, always review and update the input nodes (`textInput`, `imageInput`, `videoInput`) with the new content before running. A duplicated workflow still has the old inputs baked in.

## build_graph is the only graph mutation tool

All graph mutations — adding, updating, removing nodes and edges — go through `build_graph`. The old single-node tools (`add_node`, `remove_node`, `update_node_data`, `connect_nodes`, `disconnect_nodes`, `list_edges`) have been removed. One atomic call per mutation, always.

`build_graph` runs a topological column layout (groups nodes by depth, stacks per column) that produces a proper DAG.

**Always call `organize_layout` after `build_graph`**: The auto-positioning in `build_graph` can produce overlapping nodes in complex workflows. After every `build_graph` call, immediately call `organize_layout` to clean up the layout into a proper left-to-right DAG. This is cheap and instant — always do it.

**Phased construction is fine** — you can call `build_graph` multiple times across a session (e.g., build the input+enrichment layer first, review with the user, then build the generation layer in a second call). Each `build_graph` call auto-appends its new nodes to the right of existing ones with a clean column layout.

**Rule**: if you're adding 2+ nodes as one logical group, they MUST go through a single `build_graph` call. Multiple `build_graph` calls for separate phases are fine. Always follow with `organize_layout`.

## Check prompt templates first

Always call `list_prompt_templates` and check if a built-in template fits the use case — they're tuned for each model's quirks and produce better results than ad-hoc prompts. If no template fits the specific use case, the agent can write a custom prompt (`promptTemplate: "custom"` + `customPrompt`). But check templates first — don't default to custom.

## Validate before sharing

Always `validate_workflow` after building. Fix issues before telling the user it's ready.
