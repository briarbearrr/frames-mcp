# Nodes and Connections

## Node categories

### Input nodes (provide data to the pipeline)

| Type         | Label       | Output socket | Purpose                                             |
| ------------ | ----------- | ------------- | --------------------------------------------------- |
| `textInput`  | Text Input  | text          | User-provided text (prompts, descriptions, scripts) |
| `imageInput` | Image Input | image         | User-provided image (reference photos, logos)       |
| `videoInput` | Video Input | video         | User-provided video (source footage)                |

### AI nodes (generate content — cost credits)

| Type              | Label            | Input sockets              | Output socket | Execution                                 |
| ----------------- | ---------------- | -------------------------- | ------------- | ----------------------------------------- |
| `textAI`          | Text AI          | text                       | text          | Sync — instant result                     |
| `storyAI`         | Story AI         | text                       | text          | Sync — instant result                     |
| `imageAI`         | Image AI         | text, image (optional ref) | image         | Async — background job, polls until done  |
| `videoAI`         | Video AI         | text, image                | video         | Async — background job (can take minutes) |
| `voiceAI`         | Voice AI         | text                       | audio         | Sync — instant result                     |
| `websiteResearch` | Website Research | text                       | text          | Sync                                      |

### Data nodes (configure and filter)

| Type             | Label           | Purpose                                                   |
| ---------------- | --------------- | --------------------------------------------------------- |
| `globalStyle`    | Global Style    | Applies a visual style template to all connected AI nodes |
| `gate`           | Gate            | Approval checkpoint — pauses execution for review         |
| `trendSelector`  | Trend Selector  | Picks trending topics from the trend database             |
| `tiktokResearch` | TikTok Research | Analyzes TikTok trends and content                        |

### Edit nodes (transform media)

| Type            | Label          | Input                   | Output | Purpose                        |
| --------------- | -------------- | ----------------------- | ------ | ------------------------------ |
| `videoTrim`     | Video Trim     | video                   | video  | Trim start/end of a video      |
| `videoMerge`    | Video Merge    | video (multiple)        | video  | Combine multiple videos        |
| `videoCaptions` | Video Captions | video, audio (optional) | video  | Add captions/subtitles overlay |

### Compose nodes (combine media)

| Type        | Label     | Purpose                                       |
| ----------- | --------- | --------------------------------------------- |
| `slideshow` | Slideshow | Combine images + audio into a video slideshow |

### Flow nodes (control execution)

| Type            | Label          | Purpose                                                |
| --------------- | -------------- | ------------------------------------------------------ |
| `iterator`      | Iterator       | Loop over an array — executes body nodes for each item |
| `closeIterator` | Close Iterator | Collects loop results back into an array               |

## Socket types

There are 5 socket types. Connections are only valid between compatible sockets:

| Socket  | Color  | Compatible with           |
| ------- | ------ | ------------------------- |
| `text`  | Blue   | text, any                 |
| `image` | Green  | image, any                |
| `video` | Purple | video, any                |
| `audio` | Orange | audio, any                |
| `any`   | Gray   | text, image, video, audio |

**Rule**: You can only connect an output to an input if their socket types are compatible.

## Connection rules

- Each input handle accepts **one** connection by default (some nodes override this via `connectionValidator`)
- Output handles can connect to **multiple** inputs
- No cycles allowed — the graph must be a DAG
- Use `get_node_type_info` to check a node's exact handles and connection limits

## Configuring nodes

Each node has configurable fields set via `update_node_data` or in `build_graph` dataUpdates. The server validates all values and returns clear error messages for out-of-range parameters. Mutation responses include `configurableFields` with full constraints (types, defaults, min/max/step, allowed options).

Common fields:

- **AI nodes**: `model` (model ID), `promptTemplate` (prompt template slug or "custom"), `customPrompt` (when promptTemplate is "custom"), `style` (style template slug)
- **Text Input**: `text` (the content), `label` (display name)
- **Image Input**: `url` (image URL — auto-normalized to internal format), `label` (display name)
- **Video Input**: `url` (video URL), `label` (display name)
- **Voice AI**: `model`, `presetVoiceId` (voice ID from `list_voices`), `stability`, `similarityBoost`
- **Video AI**: `model`, `mode` (standard/pro), `duration`, `aspectRatio`

Use `get_node_type_info` for the exact field schema of any node if you need to check constraints before setting values.

## Handle IDs

Both input and output handles use the raw ID from node definitions — no suffixes, no transformations. Use `get_node_type_info({ nodeType: "..." })` to see exact IDs for any node.

Common handles:

- `textInput`: output `text`
- `textAI`: output `text`, input `text`
- `storyAI`: outputs `scene_1`–`scene_5`, input `text`
- `imageAI`: output `image`, inputs `text`, `image`
- `videoAI`: output `video`, inputs `text`, `startFrame` (not all models accept startFrame — use `get_model_capabilities` to check)
- `voiceAI`: output `audio`, input `text`
- `websiteResearch`: outputs `brandDocument`, `colorPalette`, `screenshots`
- `videoCaptions`: output `video`, inputs `video`, `audio`
- `slideshow`: output `video`, inputs vary by config
- `iterator`/`closeIterator`: output `items`/`collected`
