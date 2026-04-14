# Execution

## Inspecting node types

```
get_node_type_info({ nodeType: "videoAI" })
```

Parameter is `nodeType` (not `type`). Returns fields, models, input/output handles, and constraints.

## Sync vs async nodes

| Sync (instant result)                         | Short async (server polls)                    | Long async (returns jobId immediately)             |
| --------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `textAI`, `storyAI`, `voiceAI`, `trendSelector` | `imageAI`, `websiteResearch`, `tiktokResearch` | `videoAI`, `videoCaptions`, `videoMerge`, `slideshow` |

**Sync**: `run_node` returns the output immediately.

**Short async**: `run_node` starts a background job, polls automatically, and returns the result when complete. Typically under ~60s.

**Long async**: `run_node` returns `{ status: "running", jobId }` **immediately** without server-side polling — the MCP client request timeout is shorter than these jobs take. You MUST poll via `get_node_outputs(workflowId, nodeId)` every ~10s until a success record appears, then show `mediaUrls` to the user. Do NOT call `run_node` again for the same node while a job is active — it will reject with "active job".

**Overriding**: pass `wait: true` on a long async node to force server-side polling (rarely needed — only if you're confident the job finishes within the MCP request window). Pass `wait: false` on a short async node to get jobId immediately.

## Running nodes

```
run_node({ workflowId: "...", nodeId: "...", inputs: { text: "..." } })
```

- If `inputs` is omitted, the node resolves inputs from connected upstream nodes (requires those nodes to have been executed first)
- If `inputs` is provided, it overrides resolved inputs — useful for testing a node in isolation
- Returns: `executionId`, `nodeId`, `nodeType`, `status`, `output`, `durationMs`, `creditsCharged`
- Async nodes return: `jobId`, `jobType`, `status`, `result` (after polling completes)

The tool response includes `tier`, `mediaUrls`, and `_agentInstructions` — follow the instructions in each response to know when to show results and when to pause for user approval.

## run_workflow — MANDATORY polling loop

Requires `userConfirmed: true` — the tool rejects calls without it. Always prefer `run_node` tier-by-tier.

```
run_workflow({
  workflowId: "...",
  userConfirmed: true,
  userInputs: {
    "text-input-node-id": "My input text",           // shorthand — auto-wraps to { text: "..." }
    "image-input-node-id": ["https://example.com/img.jpg"]  // shorthand for imageInput
  }
})
```

**userInputs format**: Keyed by input node ID. Supports two formats:

- **Shorthand**: `"nodeId": "value"` — auto-wraps based on node type (`textInput` → `{ text: value }`, `imageInput` → `{ imageUrls: value }`, `videoInput` → `{ videoUrl: value }`)
- **Full form**: `"nodeId": { "text": "...", "otherField": "..." }` — passed as-is to the node data

**Important**: Input nodes (`textInput`, `imageInput`, `videoInput`) must have data — either set via `build_graph` (`dataUpdates`) before running, or passed via `userInputs`. The tool validates this and returns an error listing empty input nodes.

**Best practice for large inputs**: Set text data via `build_graph` first, then call `run_workflow` without `userInputs`. This avoids large payloads in a single MCP call and is more reliable over flaky connections.

```
// Step 1: Set the input text
build_graph({ workflowId: "...", dataUpdates: [{ nodeId: "text-input-id", data: { text: "long content..." } }] })
// Step 2: Run without userInputs — uses the data already on the node
run_workflow({ workflowId: "...", userConfirmed: true })
```

When you DO call `run_workflow`, it returns immediately with `{ run_id, status: "running" }` and dispatches execution in the background. **You MUST enter a polling loop:**

```
1. Call get_workflow_run_status({ run_id }) every 5 seconds.
2. Continue polling until status is NOT "running" or "pending"
   (terminal states: "completed", "partial", "failed", "cancelled").
3. On "completed":
     - Read outputs from the response.
     - Call get_node_outputs if you need more detail.
     - Present the final result to the user.
4. On "failed":
     - Surface the error verbatim.
     - Offer next steps (retry, edit a node, try a cheaper model).
5. Never hand control back to the user mid-run.
6. Never tell the user to say "status" or "check progress" — YOU do the polling.
```

The polling loop is non-negotiable. A user should never have to babysit a running workflow.

## Getting outputs

```
get_node_outputs({ workflowId: "...", nodeId: "...", limit: 5 })
```

Returns execution history. Outputs persist across sessions.

## Cancelling jobs

```
cancel_job({ jobId: "..." })
```

Only works on `pending` or `processing` jobs. Credits are refunded for cancelled jobs.

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
