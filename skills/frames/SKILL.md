---
name: frames
description: |
  MUST INVOKE BEFORE calling ANY `mcp__frames__*` tool. Frames is an AI video generation
  platform for building, running, and publishing AI pipelines (text, image, video, voice,
  captions) via MCP. This skill defines the required execution policy, pricing/budget
  playbook, node-by-node workflow discipline, and recommendation format — calling Frames
  MCP tools without loading it first will produce wrong behavior (skipped clarifications,
  unapproved full-workflow runs, malformed budget pitches, missing pricing lookups).

  AUTO-TRIGGER on ANY of the following, with or without "/frames":
  - Any mention of "video", "ad", "marketing video", "product video", "brand video",
    "slideshow", "reel", "voiceover", "AI pipeline", "workflow", "pipeline"
  - Any budget/credit/pricing question: "what can I build for $X", "what's possible
    with Y credits", "ideas for $X", "how much does X cost", "pricing for video"
  - Any industry-scoped video ideation: "I have a real estate agency / restaurant /
    SaaS / store — what video can I get", "video for my business"
  - Any request to build, run, list, execute, publish, modify, or debug Frames
    workflows, nodes, products, templates, or API endpoints
  - Any question about Frames models, credits, templates, MCP tools, or `mcp__frames__*`
  - User types "/frames" or references the Frames platform by name

  If a `mcp__frames__*` tool looks like a direct answer to the user's question, that is
  the STRONGEST signal to load this skill first — never shortcut straight to the tool.
metadata:
  tags: frames, video, ai, mcp, workflow, pipeline, budget, marketing, ads, recommendations, real-estate, pricing, credits, business-video
---

## What is Frames

Frames is a node-based AI workflow generation platform. Users build pipelines by connecting modular nodes that perform AI operations — text generation, image generation, video generation, voice synthesis, captions, and more. Each node does one thing; connecting them creates powerful content pipelines.

You interact with Frames through MCP tools. You can create workflows, add and connect nodes, configure AI models, execute pipelines, and publish them as API endpoints.

## How to interact

**Be collaborative and narrate your actions:**

1. When the user describes what they want to create, ask clarifying questions first:
   - What's the final output? (video, image + voiceover, slideshow, etc.)
   - Any style preferences? (cinematic, anime, realistic, etc.)
   - What AI models should be used? (or let you pick defaults)
   - Any specific requirements? (duration, aspect ratio, voice, etc.)

2. As you build, narrate each step:
   - "I'll create a workflow called 'Cat Video Pipeline'"
   - "Adding a text node to generate the scene description..."
   - "Connecting the text output to the image generator..."
   - "Setting the model to Kling 2.0 for video generation..."

3. After building, always validate with `validate_workflow` before telling the user it's ready.

4. Ask before executing — running nodes costs credits.

## Remember user context

When the user names a business, brand, industry, or drops a URL in the conversation, you MUST carry that context into every subsequent action:

1. **Treat it as a hard requirement.** Every concept, prompt, and cost quote must serve that specific brand. A generic "key-turn reveal" becomes "Sotheby's key-turn reveal". A stock prompt becomes one that names the brand and industry.
2. **Offer `websiteResearch` when a URL is given.** It extracts brand context, color palette, and screenshots you can feed into `textAI` prompts. If the user declines, bake the brand name + industry explicitly into every `textAI` node's prompt via `build_graph` with `dataUpdates`.
3. **Name concepts with the brand embedded** — never a generic format name. "Sotheby's golden-hour glide" ✓, "Golden-hour glide" ✗.
4. **Never propose a concept that would work for any business.** The pitch must only make sense for the user's specific brand. If you catch yourself writing a concept that could be copy-pasted to a restaurant or a SaaS, stop and rewrite it.

This rule applies for the entire conversation once established — you don't get to "forget" the brand between turns.

## Polling workflow execution

When you call `run_workflow`, it returns `{ run_id, status: "running" }` and starts execution in the background. You MUST enter a polling loop:

1. Call `get_run_status({ run_id })` every 5 seconds.
2. Continue polling until `status` is not `"running"` or `"pending"` (i.e., `"completed"`, `"partial"`, `"failed"`, or `"cancelled"`).
3. **Never hand control back to the user mid-run.** Never tell the user to say "status" or "check progress".
4. On `completed`: read the outputs from the response and present the final result.
5. On `failed`: surface the error and offer next steps.

## Check existing resources first

Before creating a new workflow, check for existing resources:

1. `list_workflows` — check `nodeTypes` array for workflows with matching pipeline structure
2. `list_products` — check for published products that already do what's needed
3. If a match exists, use `duplicate_workflow` to copy and modify
4. Only `create_workflow` from scratch if nothing suitable exists

When scanning workflows, if any are missing a description, generate one from the graph structure via `get_workflow` and save it with `update_workflow`.

## Recommending what to build for a budget

If the user asks "what can I build for $X", "what's possible with Y credits", or any budget-scoped ideation question, load [rules/recommendations.md](rules/recommendations.md) before responding. The playbook calls `discover_options` first, then returns a single ranked list of 4–6 creative concepts — each pitched as a 2-sentence idea with a "Pipeline: uses X" realization line (saved workflow, product, essential, template, or custom build) and an upper-bound "up to N credits" cost. Never use bucket headers. Never name a concept by its format ("slideshow ad", "hero shot"). Never quote custom-build costs without calling `get_pricing` per node.

## Parameter validation

The server validates all field values on `build_graph` — invalid values return clear error messages that include the field's full schema in the `details.fieldErrors` payload. Scalar type mismatches that are unambiguous (e.g., `"off"` for a boolean field, or a numeric string for a number field) are auto-coerced so you don't need to retry.

## Tool categories

Load the relevant rules file when working in each area:

- **Budget-scoped recommendations ("what can I build for $X")** → load [rules/recommendations.md](rules/recommendations.md)
- **Building workflows from scratch or templates** → load [rules/workflow-patterns.md](rules/workflow-patterns.md)
- **Understanding available nodes, sockets, and connections** → load [rules/nodes.md](rules/nodes.md)
- **Choosing and configuring AI models** → load [rules/models.md](rules/models.md)
- **Running nodes, workflows, or checking outputs** → load [rules/execution.md](rules/execution.md)
- **Credit balance, pricing, or cost estimation** → load [rules/billing.md](rules/billing.md)
- **Publishing workflows as API endpoints** → load [rules/products.md](rules/products.md)

## Quick tool reference

### Discovery (always safe to call)

- `discover_options({ budget, include?, exclude? })` — budget-aware recommendation mixing user workflows, products, essentials, and templates. Use for any "what can I build for $X" question.
- `list_node_types` — see all available nodes
- `get_node_type_info({ nodeType })` — details on a specific node (fields, models, handle IDs)
- `list_models` — available AI models by category
- `get_model_capabilities` — full spec for a model
- `list_prompt_templates` — prompt presets for AI nodes
- `list_style_templates` — visual style presets
- `list_voices` — ElevenLabs voice options
- `list_workflow_templates` — pre-built workflow templates

### Workflow management

- `create_workflow` / `get_workflow` / `list_workflows` / `update_workflow` / `delete_workflow` / `duplicate_workflow`

### Graph building

- `build_graph` — **THE ONLY graph mutation tool.** Atomic batch ops: `addNodes`, `addEdges`, `dataUpdates` (partial merge), `removeNodeIds`, `removeEdgeIds`. Supports `tempId` references for edges to newly-added nodes. Auto-positions in a clean DAG layout.
- `organize_layout` — opt-in full re-layout pass (dagre). Overwrites positions.
- `validate_workflow` — check for issues AND warnings before execution. If warnings are present, ask the user about them before running.

### Execution (costs credits)

- `run_node` — execute a single node (default — follow `_agentInstructions` in each response)
- `run_workflow` — execute entire workflow (requires `userConfirmed: true`). Returns `{ run_id }`; you MUST poll `get_run_status({ run_id })` every 5s until terminal.
- `get_node_outputs` — retrieve execution results
- `cancel_job` — cancel an in-progress async job

### Billing

- `get_credit_balance` — check remaining credits
- `get_pricing` — two modes: (1) lookup rate cards by operation/model, (2) **chain mode** — pass `{ chain: [{ type, model?, config? }, ...] }` with every AI node in your planned pipeline to get a server-computed `totalUpperBound` for custom-build cost quoting. Always use chain mode for custom builds so small nodes like textAI are never dropped from the sum.

### Products (API publishing)

- `publish_product` / `republish_product` / `unpublish_product` / `list_products` / `get_product`
- `get_product_schema` / `estimate_product_cost`
- `set_product_inputs` — mark nodes as API inputs/outputs
- `create_api_key` / `list_api_keys` / `revoke_api_key`
- `get_run_status` / `list_runs` — monitor API runs

### Templates

- `list_workflow_templates` — browse available templates
- `create_from_template` — create workflow from a template
