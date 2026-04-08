---
name: frames
description: |
  Frames — AI video generation platform. Build and run AI pipelines using natural language
  through the Frames MCP server. Create workflows with text, image, video, and voice AI nodes,
  connect them into pipelines, execute them, and publish as API endpoints.
metadata:
  tags: frames, video, ai, mcp, workflow, pipeline
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

## Check existing resources first

Before creating a new workflow, check for existing resources:

1. `list_workflows` — check `nodeTypes` array for workflows with matching pipeline structure
2. `list_products` — check for published products that already do what's needed
3. If a match exists, use `duplicate_workflow` to copy and modify
4. Only `create_workflow` from scratch if nothing suitable exists

When scanning workflows, if any are missing a description, generate one from the graph structure via `get_workflow` and save it with `update_workflow`.

## Parameter validation

The server validates all field values on `add_node`, `update_node_data`, and `build_graph` — invalid values return clear error messages. These tools also return `configurableFields` with full constraints (min/max/step/options) in their responses.

## Tool categories

Load the relevant rules file when working in each area:

- **Building workflows from scratch or templates** → load [rules/workflow-patterns.md](rules/workflow-patterns.md)
- **Understanding available nodes, sockets, and connections** → load [rules/nodes.md](rules/nodes.md)
- **Choosing and configuring AI models** → load [rules/models.md](rules/models.md)
- **Running nodes, workflows, or checking outputs** → load [rules/execution.md](rules/execution.md)
- **Credit balance, pricing, or cost estimation** → load [rules/billing.md](rules/billing.md)
- **Publishing workflows as API endpoints** → load [rules/products.md](rules/products.md)

## Quick tool reference

### Discovery (always safe to call)

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

- `add_node` / `remove_node` / `update_node_data` — single operations (avoid for building — use `build_graph`)
- `connect_nodes({ sourceHandle, targetHandle })` / `disconnect_nodes` / `list_edges` — edge management (avoid — use `build_graph`)
- `build_graph` — **ALWAYS use this** for building pipelines (atomic, 1 call vs many)
- `validate_workflow` — check for issues before execution

### Execution (costs credits)

- `run_node` — execute a single node (default — follow `_agentInstructions` in each response)
- `run_workflow` — execute entire workflow (requires `userConfirmed: true`)
- `get_node_outputs` — retrieve execution results
- `cancel_job` — cancel an in-progress async job

### Billing

- `get_credit_balance` — check remaining credits
- `get_pricing` — credit costs per operation/model

### Products (API publishing)

- `publish_product` / `republish_product` / `unpublish_product` / `list_products` / `get_product`
- `get_product_schema` / `estimate_product_cost`
- `set_product_inputs` — mark nodes as API inputs/outputs
- `create_api_key` / `list_api_keys` / `revoke_api_key`
- `get_run_status` / `list_runs` — monitor API runs

### Templates

- `list_workflow_templates` — browse available templates
- `create_from_template` — create workflow from a template
