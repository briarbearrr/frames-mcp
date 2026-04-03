# Workflow Patterns & Best Practices

## Golden rules

1. **ALWAYS use `build_graph`** — never `add_node` + `connect_nodes` individually. `build_graph` is atomic, 1 call, auto-positions nodes in a clean DAG layout.
2. **ALWAYS enrich prompts** — never connect `textInput` directly to `imageAI` or `videoAI`. Route through `textAI` with a prompt template first. This is the single biggest quality improvement.
3. **Image first, then video** — video generation is slow (1–4 min) and expensive. Generate an image first, iterate until it looks right, then use it as a start frame for video. Don't skip straight to video.
4. **One Text AI per purpose** — when a workflow needs both a video prompt AND a narration script, use TWO separate `textAI` nodes. Each feeds ONLY its downstream node. Never connect narration to video or vice versa.
5. **Reuse before building** — `list_workflows` first, `duplicate_workflow` if a match exists.

## Connection logic

Each node type has a specific role. Connect them based on what data flows where:

| Source node             | Output                   | Connects to       | Target handle | Why                                                       |
| ----------------------- | ------------------------ | ----------------- | ------------- | --------------------------------------------------------- |
| `textInput`             | `text`                   | `textAI`          | `text`        | Raw input → prompt enrichment                             |
| `textInput`             | `text`                   | `websiteResearch` | —             | websiteResearch has no inputs; URL is configured via data |
| `textAI` (video prompt) | `text`                   | `videoAI`         | `text`        | Enriched prompt → video generation                        |
| `textAI` (image prompt) | `text`                   | `imageAI`         | `text`        | Enriched prompt → image generation                        |
| `textAI` (narration)    | `text`                   | `voiceAI`         | `text`        | Script → voice synthesis                                  |
| `imageAI`               | `image`                  | `videoAI`         | `startFrame`  | Start frame → video (much better results). **Not all models/modes accept this** — check with `get_model_capabilities` |
| `videoAI`               | `video`                  | `videoCaptions`   | `video`       | Video → add captions                                      |
| `voiceAI`               | `audio`                  | `videoCaptions`   | `audio`       | Voiceover → burn into captioned video                     |
| `websiteResearch`       | `brandDocument`          | `textAI`          | `text`        | Brand context → prompt enrichment                         |
| `websiteResearch`       | `colorPalette`           | `textAI`          | `text`        | Color info → style-aware prompts                          |
| `websiteResearch`       | `screenshots`            | `imageAI`         | `image`       | Website visual → reference image                          |
| `storyAI`               | `scene_1`–`scene_5`      | `imageAI`         | `text`        | Scene prompt → image per scene                            |
| `imageAI` #1            | `image`                  | `imageAI` #2      | `image`       | Reference chain for character consistency                 |
| `videoAI`               | `firstFrame`/`lastFrame` | `videoAI` (next)  | `startFrame`  | Scene continuity across clips                             |

**Anti-patterns** (never do these):

- `textInput` → `videoAI` (no prompt enrichment — bad results)
- `textAI` (narration) → `videoAI` (narration text is not a video prompt)
- `voiceAI` → `videoAI` (audio doesn't connect to video generation)
- `textInput` → `voiceAI` (raw text sounds unnatural — enrich first)

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
    { tempId: "t2", type: "textAI", data: { template: "video" } },
    { tempId: "t3", type: "imageAI" },
    { tempId: "t4", type: "videoAI" }
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
    { tempId: "vidPrompt", type: "textAI", data: { template: "video" } },
    { tempId: "narration", type: "textAI", data: { template: "narration" } },
    { tempId: "img", type: "imageAI" },
    { tempId: "video", type: "videoAI", data: { aspectRatio: "9:16" } },
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

## Pattern: Brand analysis → marketing video

Use `websiteResearch` to extract brand context, then feed it into prompt generation.

```
websiteResearch ──brandDocument──→ textAI #1 (video prompt) ──→ imageAI ──→ videoAI ──→ videoCaptions
       │                                                                                      ↑
       └──brandDocument──→ textAI #2 (narration) ──→ voiceAI ────────────────────────────────┘
```

`websiteResearch` has NO input sockets — the URL is configured via `update_node_data({ data: { url: "https://..." } })`. It outputs `brandDocument` (text analysis), `colorPalette` (colors), and `screenshots` (images).

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

## Build process

1. `list_workflows` — check for existing workflows to duplicate
2. `create_workflow` — new empty workflow
3. `build_graph` — add ALL nodes and edges in one call (never individual add_node + connect_nodes)
4. `validate_workflow` — check for issues
5. Share the workflow URL with the user

## Execution strategy

- **Iterating**: Use `run_node` one at a time. Review image results before generating video. Regenerate individual nodes as needed.
- **Production run**: Use `run_workflow` with `userInputs` for the full pipeline.
- **Cost check**: Call `get_credit_balance` before video generation. Video is expensive — inform the user.

## Validation checklist

Before telling the user a workflow is ready:

1. `validate_workflow` — fix any reported issues
2. All AI nodes have models set
3. All required inputs are connected (check with `get_node_type_info`)
4. Input nodes have content or are clearly for user input at run time
5. No narration/script Text AI connected to Video AI (common mistake)
