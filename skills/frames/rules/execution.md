# Execution

## Sync vs async nodes

| Sync (instant result)          | Async (background job) |
| ------------------------------ | ---------------------- |
| `textAI`, `storyAI`, `voiceAI` | `imageAI`, `videoAI`   |

**Sync**: `run_node` returns the output immediately in the response.

**Async**: `run_node` starts a background job, polls automatically, and returns the result when complete. Video generation can take several minutes — let the user know it's processing.

## Running nodes

```
run_node({ workflowId: "...", nodeId: "...", inputs: { text: "..." } })
```

- If `inputs` is omitted, the node resolves inputs from connected upstream nodes (requires those nodes to have been executed first)
- If `inputs` is provided, it overrides resolved inputs — useful for testing a node in isolation

The tool response includes `tier`, `mediaUrls`, and `_agentInstructions` — follow the instructions in each response to know when to show results and when to pause for user approval.

## run_workflow

Requires `userConfirmed: true` — the tool rejects calls without it. Always prefer `run_node` tier-by-tier. See the tool description for details.

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
