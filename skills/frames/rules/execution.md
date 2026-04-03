# Execution

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

```
run_workflow({
  workflowId: "...",
  userInputs: { "node-id-1": { text: "My input text" } }  // optional
})
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

## Execution order for manual runs

If running nodes individually (not `run_workflow`), execute in dependency order:

1. Input nodes don't need execution — they just hold data
2. Run upstream AI nodes first (text generation)
3. Then dependent nodes (image from text, video from image)
4. Each node resolves inputs from the most recent output of connected upstream nodes

## Cost awareness

- Always check `get_credit_balance` before suggesting execution
- Use `get_pricing` to estimate costs before running expensive operations (video generation)
- Ask the user before executing — don't run nodes without confirmation
- Mention the approximate cost when proposing to run something
