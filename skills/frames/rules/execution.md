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

## run_workflow — MANDATORY polling loop

Requires `userConfirmed: true` — the tool rejects calls without it. Always prefer `run_node` tier-by-tier.

When you DO call `run_workflow`, it returns immediately with `{ run_id, status: "running" }` and dispatches execution in the background. **You MUST enter a polling loop:**

```
1. Call get_run_status({ run_id }) every 5 seconds.
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
