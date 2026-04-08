# Execution

## Inspecting node types

```
get_node_type_info({ nodeType: "videoAI" })
```

Parameter is `nodeType` (not `type`). Returns fields, models, input/output handles, and constraints.

## Sync vs async nodes

| Sync (instant result)          | Async (background job) |
| ------------------------------ | ---------------------- |
| `textAI`, `storyAI`, `voiceAI` | `imageAI`, `videoAI`   |

**Sync**: `run_node` returns the output immediately in the response.

**Async**: `run_node` starts a background job, polls automatically, and returns the result when complete. Video generation can take several minutes — let the user know it's processing.

## Running a single node

```
run_node({
  workflowId: "...",
  nodeId: "...",
  inputs: { text: "A cinematic shot of a sunset over mountains" }  // optional override
})
```

- If `inputs` is omitted, the node resolves inputs from connected upstream nodes (requires those nodes to have been executed first)
- If `inputs` is provided, it overrides resolved inputs — useful for testing a node in isolation
- Returns: `executionId`, `nodeId`, `nodeType`, `status`, `output`, `durationMs`, `creditsCharged`
- Async nodes return: `jobId`, `jobType`, `status`, `result` (after polling completes)

## Running an entire workflow

> **WARNING: `run_workflow` skips all review checkpoints.** It executes every node without pausing for output review or user approval. The agent should **never use `run_workflow` by default** — always use `run_node` in dependency order so the user can review and approve each step. See best-practices.md for the full approval protocol.

`run_workflow` is only allowed when the user **explicitly requests** full pipeline execution AND the agent has warned about cost and loss of review control, and the user has confirmed.

```
run_workflow({
  workflowId: "...",
  userInputs: {
    "text-input-node-id": "My input text",           // shorthand — auto-wraps to { text: "..." }
    "image-input-node-id": ["https://example.com/img.jpg"]  // shorthand for imageInput
  }
})
```

**userInputs format**: Keyed by input node ID. Supports two formats:

- **Shorthand**: `"nodeId": "value"` — auto-wraps based on node type (`textInput` → `{ text: value }`, `imageInput` → `{ imageUrls: value }`, `videoInput` → `{ videoUrl: value }`)
- **Full form**: `"nodeId": { "text": "...", "otherField": "..." }` — passed as-is to the node data

**Important**: Input nodes (textInput, imageInput, videoInput) must have data — either set via `update_node_data` before running, or passed via `userInputs`. The tool validates this and returns an error listing empty input nodes.

**Best practice for large inputs**: Set text data via `update_node_data` first, then call `run_workflow` without `userInputs`. This avoids large payloads in a single MCP call and is more reliable over flaky connections.

```
// Step 1: Set the input text
update_node_data({ workflowId: "...", nodeId: "text-input-id", data: { text: "long content..." } })
// Step 2: Run without userInputs — uses the data already on the node
run_workflow({ workflowId: "..." })
```

- Executes all nodes in topological order (respects dependencies)
- Returns a `productRunId` — use `get_node_outputs` to retrieve results
- The workflow runs in the background as a product run

## Getting outputs

```
get_node_outputs({
  workflowId: "...",
  nodeId: "...",  // optional — omit to get all nodes
  limit: 5       // optional — max results per node
})
```

- Returns execution history: `executionId`, `nodeType`, `status`, `output`, `creditsCharged`, `createdAt`
- Outputs persist across sessions — you can retrieve results from previous runs

## Cancelling jobs

```
cancel_job({ jobId: "..." })
```

- Only works on `pending` or `processing` jobs
- Credits are refunded for cancelled jobs

## Execution order — batch by tier

Run nodes in dependency-ordered **batches**, not one-by-one:

1. **Input nodes** don't need execution — they just hold data
2. **Batch 1 — Text tier**: Run all `textAI`, `storyAI`, `voiceAI` nodes at once (fast, cheap). Present combined text outputs for review.
3. **Batch 2 — Image tier**: After user approves text, run all `imageAI` nodes at once. Present images for review.
4. **Batch 3 — Video tier**: After user approves images, run `videoAI` nodes. These are slow and expensive — always confirm cost first.
5. **Batch 4 — Post-processing**: `videoCaptions`, `videoMerge`, `slideshow` etc.

Each node resolves inputs from the most recent output of connected upstream nodes. Only pause between tiers — not between individual nodes within a tier.

## Cost awareness

- Always check `get_credit_balance` before suggesting execution
- Use `get_pricing` to estimate costs before running expensive operations (video generation)
- Ask the user before executing — don't run nodes without confirmation
- Mention the approximate cost when proposing to run something
