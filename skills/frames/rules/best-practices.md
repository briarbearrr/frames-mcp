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

If the user wants a single image or video, use `textAI` to enrich the prompt. If they want multiple scenes (slideshow, video series, story), use `storyAI` — it generates structured multi-scene output that can be split with an `iterator` node.

Don't try to make `textAI` output multiple scenes by hacking the prompt.

## Video always needs an image first

`videoAI` requires an image input — it animates a still image into video. Always generate or provide an image upstream:

```
textAI → imageAI → videoAI    (generated first frame)
imageInput → videoAI            (user-provided first frame)
```

Never try to connect text directly to videoAI without an image in between.

## Voice reads the enriched script, not the raw input

Connect `voiceAI` to the output of `textAI` or `storyAI`, not directly to `textInput`. The AI-generated text is written for narration — proper pacing, sentence structure, and flow. Raw user input usually isn't.

```
textInput → textAI (script template) → voiceAI
```

## Use globalStyle for visual consistency

When a workflow generates 2 or more images or videos, add a `globalStyle` node and connect it to all AI generation nodes. This ensures consistent visual style across all outputs.

Use `list_style_templates` to pick a style, or let the user choose. Without globalStyle, each generation may have a different look.

## Check credits before expensive operations

Video generation is significantly more expensive than text or image generation. Before running a workflow with videoAI nodes:

1. Call `get_credit_balance` to check available credits
2. Call `get_pricing({ operation: "video-generation" })` to get the cost
3. Tell the user the approximate cost and ask for confirmation

Don't surprise users with unexpected credit usage.

## Use build_graph for efficiency

When creating a workflow from scratch, use `build_graph` to add all nodes and edges in a single atomic operation. This is faster, avoids partial state, and supports `tempId` references between new nodes.

Only use individual `add_node` / `connect_nodes` for incremental modifications to existing workflows.

## Pick the right prompt template

Don't write custom prompts unless the user specifically asks for it. Call `list_prompt_templates` for the relevant node type and use the template designed for that use case. Templates are curated and optimized — they produce better results than ad-hoc prompts.

Set `template: "custom"` + `customPrompt` only when the user provides their own prompt text.

## Validate before sharing

Always call `validate_workflow` after building or modifying a workflow. Fix any issues before telling the user the workflow is ready. Common issues:

- Disconnected nodes (missing edges)
- AI nodes without a model set
- Required inputs not connected
- Socket type mismatches

## Node naming

Set meaningful `label` values on nodes via `update_node_data` so the user can understand the workflow at a glance. E.g., "Scene Description" instead of "Text AI", "Hero Image" instead of "Image AI".
