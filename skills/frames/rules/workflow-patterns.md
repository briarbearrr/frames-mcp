# Workflow Patterns

Common recipes for building workflows. Use `build_graph` for efficiency — it creates all nodes and edges in one atomic operation.

## Pattern: Simple text-to-video

**Goal**: Generate a video from a text description.

**Pipeline**: `textInput` → `textAI` → `imageAI` → `videoAI`

**Steps**:
1. Create workflow with `create_workflow`
2. Use `build_graph` to add all nodes and connect them:
   - `textInput`: user provides the concept/description
   - `textAI`: enhances the description into a detailed scene prompt (set `template` to a suitable prompt template)
   - `imageAI`: generates the first frame from the enhanced text
   - `videoAI`: animates the image into a video
3. Validate with `validate_workflow`
4. Configure node data (models, templates) with `update_node_data` or as part of `build_graph` dataUpdates

**Tip**: Use `list_prompt_templates` for `textAI` and `imageAI` to pick the right prompt template for the use case.

## Pattern: Video with voiceover

**Goal**: Generate a video with AI narration.

**Pipeline**: `textInput` → `textAI` (script) → `imageAI` → `videoAI` + `voiceAI` → (user combines externally or uses slideshow)

**Steps**:
1. `textInput` → `textAI` (generates the narration script)
2. `textAI` → `voiceAI` (converts script to speech)
3. Same `textAI` or a second `textAI` → `imageAI` → `videoAI` (generates visuals)
4. The video and audio outputs are available separately in the execution results

**Tip**: Use `list_voices` to let the user pick a voice they like.

## Pattern: Slideshow with captions

**Goal**: Create a multi-scene slideshow with captions and audio.

**Pipeline**: `textInput` → `storyAI` → `imageAI` (multiple via iterator) → `slideshow` → `videoCaptions`

**Steps**:
1. `textInput` → `storyAI`: generates a multi-scene story structure
2. `storyAI` → `iterator`: splits scenes into individual items
3. Inside loop: each scene → `imageAI` (generates scene image)
4. `closeIterator`: collects all images
5. Images + optional audio → `slideshow`: combines into video
6. `slideshow` → `videoCaptions`: adds subtitles

## Pattern: Style-consistent content

**Goal**: Apply a consistent visual style across all generated images/videos.

**How**: Add a `globalStyle` node to the workflow — no connections needed, it broadcasts style automatically. Set its `style` field to a template slug from `list_style_templates`.

The global style node injects style context into all connected AI prompts automatically.

## Pattern: Quick start from template

**Steps**:
1. `list_workflow_templates` — browse available pre-built workflows
2. `create_from_template` — create a copy to customize
3. `get_workflow` — inspect the graph to understand the pipeline
4. Modify as needed with `update_node_data` or graph mutations

## Building with `build_graph`

Always prefer `build_graph` over individual `add_node` + `connect_nodes` calls. It's atomic and supports `tempId` references:

```
build_graph({
  workflowId: "...",
  addNodes: [
    { tempId: "t1", type: "textInput", data: { text: "A cat playing piano" } },
    { tempId: "t2", type: "textAI", data: { model: "gemini-2.5-flash", template: "enhance-prompt" } },
    { tempId: "t3", type: "imageAI", data: { model: "imagen-3" } },
    { tempId: "t4", type: "videoAI", data: { model: "kling-2.0" } }
  ],
  addEdges: [
    { sourceNode: "t1", sourceHandle: "text-output", targetNode: "t2", targetHandle: "text" },
    { sourceNode: "t2", sourceHandle: "text-output", targetNode: "t3", targetHandle: "text" },
    { sourceNode: "t3", sourceHandle: "image-output", targetNode: "t4", targetHandle: "image" }
  ]
})
```

**Important**: The `tempId` values are only for referencing within the same `build_graph` call. The server returns the real node IDs.

## Validation checklist

Before telling the user a workflow is ready:

1. Call `validate_workflow` to check for issues
2. Verify all AI nodes have models set (use defaults if not specified)
3. Verify required inputs are connected (check with `get_node_type_info`)
4. Confirm input nodes have content or are clearly meant for user input at run time
