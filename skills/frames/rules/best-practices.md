# Best Practices

Follow these when building any workflow. They produce better results and avoid common mistakes.

## Always enrich prompts

Never connect a `textInput` directly to `imageAI` or `videoAI`. Raw user text like "a cat playing piano" produces mediocre results. Always route through `textAI` first with an appropriate prompt template:

```
textInput → textAI (template: image/video prompt enricher) → imageAI → videoAI
```

The textAI node transforms "a cat playing piano" into a detailed, model-optimized prompt with lighting, composition, camera angle, and style details. This is the single biggest quality improvement.

Use `list_prompt_templates({ nodeType: "textAI" })` to find the right enrichment template. There are specific templates for image prompts vs video prompts — use the right one for the downstream node.

## Use storyAI for multi-scene, textAI for single-scene

If the user wants a single image or video, use `textAI` to enrich the prompt. If they want multiple scenes (video series, story), use `storyAI` — it has 8 scene output handles (`scene_1` through `scene_8`), each producing a tailored prompt. Connect each scene to its own `imageAI` → `videoAI` chain. storyAI has modes like "multishot" and "continuous shot" to guide how it structures the scenes.

Don't try to make `textAI` output multiple scenes by hacking the prompt.

## Generate a start frame for video

`videoAI` requires a text prompt and optionally accepts a start frame image. While you can run videoAI with just text, providing a start frame image produces significantly better results — it gives the model a clear visual anchor.

```
textAI → imageAI → videoAI (startFrame)    (best results)
textAI → videoAI                            (works, but less control)
imageInput → videoAI (startFrame)           (user-provided frame)
```

videoAI also accepts `endFrame`, `referenceImages`, and `videoReference` inputs depending on the model. Use `get_node_type_info({ nodeType: "videoAI" })` for full handle details.

## Iterate on images before generating video

Video generation is slow (1–4 minutes) and expensive. **Always get the image right first.** Run `imageAI` multiple times, use the history to compare results, and only generate video once the user is happy with the start frame. This saves significant time and credits.

The workflow is: generate image → review → regenerate if needed → once satisfied, generate video from that image.

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

## Use globalStyle for visual consistency

When a workflow generates 2 or more images or videos, add a `globalStyle` node to the workflow. It broadcasts style to all AI nodes automatically via the system — no edge connections needed. Just add the node and set its `style` field to a template slug from `list_style_templates`.

Without globalStyle, each generation may have a different visual look.

## Use research nodes for brand context

`websiteResearch` scrapes a website into a text document. Connect it to `textAI` as context so AI-generated content aligns with the brand's tone and messaging. `tiktokResearch` does the same for TikTok videos — analyzing hooks, content structure, and style.

```
websiteResearch → textAI (brand-aware prompt enrichment) → imageAI
tiktokResearch → textAI (hook-style prompt) → videoAI
```

## Run nodes individually, not run-all

Prefer running nodes one at a time with `run_node` over `run_workflow` when the user is iterating. This gives control over each step — they can review and regenerate individual nodes without re-running the entire pipeline. Only use `run_workflow` for final production runs of a validated workflow.

## Check credits before video generation

Video is expensive. Call `get_credit_balance` and `get_pricing({ operation: "video-generation" })` before running videoAI nodes. Tell the user the cost and ask for confirmation.

## Use build_graph over individual calls

Use `build_graph` for new workflows (atomic, supports `tempId`). Use individual `add_node`/`connect_nodes` only for incremental edits.

## Use prompt templates, not custom prompts

Call `list_prompt_templates` and use the right template for the use case. Only set `template: "custom"` when the user provides their own prompt.

## Validate before sharing

Always `validate_workflow` after building. Fix issues before telling the user it's ready.
