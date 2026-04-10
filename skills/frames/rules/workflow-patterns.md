# Workflow Patterns & Best Practices

## Golden rules

1. **`build_graph` is the ONLY graph mutation tool.** It supports `addNodes`, `addEdges`, `dataUpdates` (partial merge), `removeNodeIds`, and `removeEdgeIds` — all atomic in one call. Auto-positions new nodes in a clean DAG layout. The old single-node tools (`add_node`, `remove_node`, `update_node_data`, `connect_nodes`, `disconnect_nodes`, `list_edges`) have been removed.
2. **ALWAYS enrich prompts** — never connect `textInput` directly to `imageAI` or `videoAI`. Route through `textAI` with a prompt template first. This is the single biggest quality improvement.
3. **Image first, then video** — video generation is slow (1–4 min) and expensive. Generate an image first, iterate until it looks right, then use it as a start frame for video. Don't skip straight to video.
4. **One Text AI per purpose** — when a workflow needs both a video prompt AND a narration script, use TWO separate `textAI` nodes. Each feeds ONLY its downstream node. Never connect narration to video or vice versa.
5. **Reuse before building** — always `list_workflows` first, even when the user says "build me X". If a workflow with a similar structure exists, `duplicate_workflow` and modify it — faster than building from zero. After duplicating, always update the input nodes with new content before running — the old inputs are still baked in.
6. **voiceAI never connects to videoAI** — video generation doesn't accept audio. To combine voice with video, both feed into `videoCaptions`.

## Connection logic

Each node type has a specific role. Connect them based on what data flows where:

| Source node             | Output                   | Connects to       | Target handle | Why                                                                                                                   |
| ----------------------- | ------------------------ | ----------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `textInput`             | `text`                   | `textAI`          | `text`        | Raw input → prompt enrichment                                                                                         |
| `textInput`             | `text`                   | `websiteResearch` | —             | websiteResearch has no inputs; URL is configured via data                                                             |
| `textAI` (video prompt) | `text`                   | `videoAI`         | `text`        | Enriched prompt → video generation                                                                                    |
| `textAI` (image prompt) | `text`                   | `imageAI`         | `text`        | Enriched prompt → image generation                                                                                    |
| `textAI` (narration)    | `text`                   | `voiceAI`         | `text`        | Script → voice synthesis                                                                                              |
| `imageAI`               | `image`                  | `videoAI`         | `startFrame`  | Start frame → video (much better results). **Not all models/modes accept this** — check with `get_model_capabilities` |
| `videoAI`               | `video`                  | `videoCaptions`   | `video`       | Video → add captions                                                                                                  |
| `voiceAI`               | `audio`                  | `videoCaptions`   | `audio`       | Voiceover → burn into captioned video                                                                                 |
| `websiteResearch`       | `brandDocument`          | `textAI`          | `text`        | Brand context → prompt enrichment                                                                                     |
| `websiteResearch`       | `colorPalette`           | `textAI`          | `text`        | Color info → style-aware prompts                                                                                      |
| `websiteResearch`       | `screenshots`            | `imageAI`         | `image`       | Website visual → reference image                                                                                      |
| `storyAI`               | `scene_1`–`scene_5`      | `imageAI`         | `text`        | Scene prompt → image per scene                                                                                        |
| `imageAI` #1            | `image`                  | `imageAI` #2      | `image`       | Reference chain for character consistency                                                                             |
| `videoAI`               | `firstFrame`/`lastFrame` | `videoAI` (next)  | `startFrame`  | Scene continuity across clips                                                                                         |

**Anti-patterns** (never do these):

- `textInput` → `videoAI` (no prompt enrichment — bad results)
- `textAI` (narration) → `videoAI` (narration text is not a video prompt)
- `voiceAI` → `videoAI` (audio doesn't connect to video generation)
- `textInput` → `voiceAI` (raw text sounds unnatural — enrich first)
- `imageInput` → `videoAI` (startFrame) without asking — the raw photo becomes the literal first frame. Ask the user if they want the exact image as frame 1, or a styled scene. Default to routing through `imageAI` for product/marketing use cases.

## Pattern: Simple text-to-video

```
textInput → textAI (video prompt) → imageAI → videoAI
```

The `imageAI` generates a start frame. This gives the video model a clear visual anchor and produces much better results than text-only input.

```
build_graph({
  workflowId: "...",
  addNodes: [
    { tempId: "t1", type: "textInput", data: { text: "A cat playing piano" } },
    { tempId: "t2", type: "textAI", data: { promptTemplate: "video" } },
    { tempId: "t3", type: "imageAI", data: { promptTemplate: "social-visual" } },
    { tempId: "t4", type: "videoAI", data: { promptTemplate: "short-form" } }
  ],
  addEdges: [
    { sourceNode: "t1", sourceHandle: "text", targetNode: "t2", targetHandle: "text" },
    { sourceNode: "t2", sourceHandle: "text", targetNode: "t3", targetHandle: "text" },
    { sourceNode: "t2", sourceHandle: "text", targetNode: "t4", targetHandle: "text" },
    { sourceNode: "t3", sourceHandle: "image", targetNode: "t4", targetHandle: "startFrame" }
  ]
})
```

Note: `textAI` feeds BOTH `imageAI` (for the start frame) AND `videoAI` (for the video prompt). The image also feeds into videoAI as the start frame.

## Pattern: Video with voiceover + captions

Two separate `textAI` nodes — one for visuals, one for narration. They never cross-connect.

```
textInput ──→ textAI #1 (video prompt) ──→ imageAI ──→ videoAI ──→ videoCaptions
    │                                                                    ↑
    └────→ textAI #2 (narration) ──→ voiceAI ────────────────────────────┘
```

```
build_graph({
  workflowId: "...",
  addNodes: [
    { tempId: "input", type: "textInput", data: { text: "..." } },
    { tempId: "vidPrompt", type: "textAI", data: { promptTemplate: "video" } },
    { tempId: "narration", type: "textAI", data: { promptTemplate: "narration" } },
    { tempId: "img", type: "imageAI", data: { promptTemplate: "social-visual" } },
    { tempId: "video", type: "videoAI", data: { aspectRatio: "9:16", promptTemplate: "short-form" } },
    { tempId: "voice", type: "voiceAI", data: { presetVoiceId: "..." } },
    { tempId: "captions", type: "videoCaptions" }
  ],
  addEdges: [
    { sourceNode: "input", sourceHandle: "text", targetNode: "vidPrompt", targetHandle: "text" },
    { sourceNode: "input", sourceHandle: "text", targetNode: "narration", targetHandle: "text" },
    { sourceNode: "vidPrompt", sourceHandle: "text", targetNode: "img", targetHandle: "text" },
    { sourceNode: "vidPrompt", sourceHandle: "text", targetNode: "video", targetHandle: "text" },
    { sourceNode: "img", sourceHandle: "image", targetNode: "video", targetHandle: "startFrame" },
    { sourceNode: "narration", sourceHandle: "text", targetNode: "voice", targetHandle: "text" },
    { sourceNode: "video", sourceHandle: "video", targetNode: "captions", targetHandle: "video" },
    { sourceNode: "voice", sourceHandle: "audio", targetNode: "captions", targetHandle: "audio" }
  ]
})
```

## Pattern: Product photo → marketing video

When the user provides a product image and wants a marketing video, route the photo through `imageAI` as a reference to generate a styled scene — never use raw product photos directly as videoAI startFrame (the video would literally start with the raw photo).

```
imageInput (product photo) ──image──→ imageAI (generate styled scene) ──→ videoAI (startFrame)
                                         ↑                                    ↑
textInput ──→ textAI #1 (video prompt) ──┘────────────────────────────────────┘
    │                                                                              → videoCaptions
    └────→ textAI #2 (narration) ──→ voiceAI ──────────────────────────────────────→     ↑
                                                                              videoAI ───┘
```

```
build_graph({
  workflowId: "...",
  addNodes: [
    { tempId: "input", type: "textInput", data: { text: "..." } },
    { tempId: "photo", type: "imageInput", data: { url: "https://..." } },
    { tempId: "vidPrompt", type: "textAI", data: { promptTemplate: "video" } },
    { tempId: "narration", type: "textAI", data: { promptTemplate: "narration" } },
    { tempId: "img", type: "imageAI", data: { aspectRatio: "9:16", promptTemplate: "social-visual" } },
    { tempId: "video", type: "videoAI", data: { aspectRatio: "9:16", promptTemplate: "marketing-ad" } },
    { tempId: "voice", type: "voiceAI", data: { presetVoiceId: "..." } },
    { tempId: "captions", type: "videoCaptions" }
  ],
  addEdges: [
    { sourceNode: "input", sourceHandle: "text", targetNode: "vidPrompt", targetHandle: "text" },
    { sourceNode: "input", sourceHandle: "text", targetNode: "narration", targetHandle: "text" },
    { sourceNode: "vidPrompt", sourceHandle: "text", targetNode: "img", targetHandle: "text" },
    { sourceNode: "vidPrompt", sourceHandle: "text", targetNode: "video", targetHandle: "text" },
    { sourceNode: "photo", sourceHandle: "image", targetNode: "img", targetHandle: "image" },
    { sourceNode: "img", sourceHandle: "image", targetNode: "video", targetHandle: "startFrame" },
    { sourceNode: "narration", sourceHandle: "text", targetNode: "voice", targetHandle: "text" },
    { sourceNode: "video", sourceHandle: "video", targetNode: "captions", targetHandle: "video" },
    { sourceNode: "voice", sourceHandle: "audio", targetNode: "captions", targetHandle: "audio" }
  ]
})
```

## Pattern: Brand analysis → marketing video

Use `websiteResearch` to extract brand context, then feed it into prompt generation.

```
websiteResearch ──brandDocument──→ textAI #1 (video prompt) ──→ imageAI ──→ videoAI ──→ videoCaptions
       │                                                                                      ↑
       └──brandDocument──→ textAI #2 (narration) ──→ voiceAI ────────────────────────────────┘
```

`websiteResearch` has NO input sockets — the URL is configured via `build_graph` with a `dataUpdates` entry (e.g. `dataUpdates: [{ nodeId: "...", data: { url: "https://..." } }]`). It outputs `brandDocument` (text analysis), `colorPalette` (colors), and `screenshots` (images).

**Provider selection**: `websiteResearch` has a `provider` field (default `firecrawl`). Set `provider: "standard"` when the user wants to avoid spending Firecrawl credits — it uses free fetch+cheerio, works on server-rendered marketing sites, but skips screenshots. If the workflow downstream uses the `screenshots` output, stay on `firecrawl`. If Firecrawl credits are exhausted, the node returns an actionable error telling the user to switch providers.

## Pattern: Multi-scene video (storyAI)

For longer content with multiple scenes, use `storyAI` to generate per-scene prompts. Chain image references for character consistency.

```
textInput → storyAI ──scene_1──→ imageAI #1 → videoAI #1
                  │                ↓ (image reference)
                  ├──scene_2──→ imageAI #2 → videoAI #2
                  │                ↓ (image reference)
                  └──scene_3──→ imageAI #3 → videoAI #3
```

Each `imageAI` connects its `image` output to the next `imageAI`'s `image` input as a reference. This keeps characters and style consistent across scenes. Without this chaining, each scene generates completely different-looking visuals.

After all videos are generated, use `videoMerge` to combine them, or `slideshow` for image-based sequences.

## Pattern: TikTok research → inspired content

Use `tiktokResearch` to analyze a trending video, then create content inspired by it.

- `tiktokResearch` outputs: `content` (analysis text), `hook` (hook text), `frame` (start frame image), `clip` (video clip)
- Connect `content` → `textAI` for context-aware prompt generation
- Connect `clip` → `videoAI` as a video reference (model must support it)
- Connect `frame` → `imageAI` as a reference image

## Pattern: Style-consistent content

Add a `globalStyle` node — it broadcasts style to all AI nodes automatically via the system. No edge connections needed. Set its `style` field to a template slug from `list_style_templates`.

## Pattern: Batch content with iterator

When the user wants to generate multiple pieces of content from a list (e.g., "make 5 product videos for these 5 products"), use `iterator` + `closeIterator` instead of duplicating the same nodes multiple times. Iterator splits an array into individual items, runs the loop body per item, and closeIterator collects the results. The workflow stays clean and handles 3 items or 30 items with the same graph.

```
textInput (JSON array) → iterator → textAI → imageAI → videoAI → closeIterator
```

## Build process

1. `list_workflows` — check for existing workflows to duplicate
2. `create_workflow` — new empty workflow
3. `build_graph` — add ALL nodes and edges in one call (the only graph mutation tool)
4. `set_product_inputs` — mark input nodes (textInput, imageInput, videoInput) as `product_inputs` and the final output node (e.g., videoCaptions, videoAI, imageAI) as `product_outputs`. This makes the workflow ready for `run_workflow` with `userInputs` and for publishing as a product API.
5. `validate_workflow` — check for issues
6. Share the workflow URL with the user

## Execution strategy

- **Iterating**: Use `run_node` one at a time. Review image results before generating video. Regenerate individual nodes as needed.
- **Production run**: Use `run_workflow` with `userInputs` for the full pipeline.
- **Cost check**: Call `get_credit_balance` before video generation. Video is expensive — inform the user.

## Validation checklist

Before telling the user a workflow is ready:

1. `validate_workflow` — fix any reported `issues` (hard errors).
2. **Surface all `warnings` to the user as one consolidated question** before proceeding to execution. Warnings include:
   - `default_prompt_template` — an AI node is using its seeded default prompt template; you haven't customized it for this workflow.
   - `default_model` — an AI node is on its seeded default model; you didn't pick one.
   - `missing_aspect_ratio` — an `imageAI` / `videoAI` node has no `aspectRatio`.
   - `empty_input` — a `textInput` / `imageInput` / `videoInput` has no content.

   If `warnings.length > 0`, do NOT run the workflow. Ask the user: "I left [list] at defaults — want me to customize them to your brand before we run?" Only proceed once the user answers.
3. All AI nodes have models set.
4. All required inputs are connected.
5. Input nodes have content or are clearly for user input at run time.
6. No narration/script Text AI connected to Video AI (common mistake).
7. Text AI nodes feeding downstream AI have `maxOutputChars` set within the downstream model's prompt limit (Imagen 4 = 1400, Kling/Veo = 9500, voice = 4500).
8. `set_product_inputs` was called — input nodes marked as product inputs, final output node marked as product output.
