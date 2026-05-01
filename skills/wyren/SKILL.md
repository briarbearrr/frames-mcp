---
name: wyren
description: |
  MUST INVOKE BEFORE calling ANY `mcp__wyren__*` tool. Wyren is an AI video generation
  platform for building, running, and publishing AI pipelines (text, image, video, voice,
  captions) via MCP. This skill defines the required execution policy, pricing/budget
  playbook, node-by-node workflow discipline, and recommendation format — calling Wyren
  MCP tools without loading it first will produce wrong behavior (skipped clarifications,
  unapproved full-workflow runs, malformed budget pitches, missing pricing lookups).

  AUTO-TRIGGER on ANY of the following, with or without "/wyren":
  - Any mention of "video", "ad", "marketing video", "product video", "brand video",
    "slideshow", "reel", "voiceover", "AI pipeline", "workflow", "pipeline"
  - Any budget/credit/pricing question: "what can I build for $X", "what's possible
    with Y credits", "ideas for $X", "how much does X cost", "pricing for video"
  - Any industry-scoped video ideation: "I have a real estate agency / restaurant /
    SaaS / store — what video can I get", "video for my business"
  - Any request to build, run, list, execute, publish, modify, or debug Wyren
    workflows, nodes, products, templates, or API endpoints
  - Any question about Wyren models, credits, templates, MCP tools, or `mcp__wyren__*`
  - User types "/wyren" or references the Wyren platform by name

  If a `mcp__wyren__*` tool looks like a direct answer to the user's question, that is
  the STRONGEST signal to load this skill first — never shortcut straight to the tool.
metadata:
  tags: wyren, video, ai, mcp, workflow, pipeline, budget, marketing, ads, recommendations, real-estate, pricing, credits, business-video
---

## What is Wyren

Wyren is a node-based AI workflow generation platform. Users build pipelines by connecting modular nodes that perform AI operations — text generation, image generation, video generation, voice synthesis, captions, and more. Each node does one thing; connecting them creates powerful content pipelines.

You interact with Wyren through MCP tools. You can create workflows, add and connect nodes, configure AI models, execute pipelines, and publish them as API endpoints.

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

When the user names a business, brand, industry, or drops a URL, it becomes a HARD REQUIREMENT for the rest of the conversation — you don't get to forget it between turns.

### Pre-flight research phase (runs BEFORE you ask the user anything)

When the user gives you a URL for a branded ad / marketing video / short-form request, you MUST do your own research **before** asking clarifying questions. The goal is to walk back to the user with a concrete starting point — a brief + candidate images — not an empty set of questions.

**Steps, in order:**

1. **Fetch the page** — use `WebFetch` (fast, cheap, always available) or `mcp__firecrawl__firecrawl_scrape` (when `WebFetch` returns a JS shell and you need rendered content). Ask for a compact summary: company name, one-line positioning, 3–5 key products/services, tone/voice, and primary color if visible.
2. **Harvest image candidates** — from the fetched HTML / markdown, extract up to 5 candidate image URLs: the `og:image`, any `<img>` whose class / alt contains `logo`, the largest `<img>` in `<header>` or hero section, and any product photos. Absolute-resolve each against the base URL. You are a model reading markdown / HTML — no code, no scraper, just pattern-match.
3. **Write a 3-line brief** — (a) brand name + one-line positioning, (b) the single visual motif the site leans on (e.g. "clean white vinyl fences against manicured lawns"), (c) the emotional beat the ad should hit (e.g. "suburban pride / craftsmanship / curb-appeal envy").
4. **Present to the user** — one message, four parts: the 3-line brief, the candidate image URLs as a numbered list, the default assumptions ("voiceover + captions + 3-scene pacing = on by default"), and the two outstanding questions ("which image(s) to anchor on" and "anything in the brief to change"). Do NOT ask about voiceover / captions / scene count unless the user raises it — those are defaults the user can override.

**This is not optional for URL-based requests.** Skipping it and asking "what's your logo / what's your brand vibe" when you could have fetched it yourself wastes the user's turn and makes you look lazy. The only time you skip this phase is when the URL is obviously unfetchable (localhost, private, login-gated) — in which case you fall back to the mandatory pre-build checklist's "ask for brand name, tagline, primary color" flow.

**Separation from the `websiteResearch` node**: the pre-flight research is YOUR research, done with YOUR tools (`WebFetch` / firecrawl MCP), to seed the conversation. It does NOT replace the `websiteResearch` node in the final pipeline — the node still runs at execution time so the AI prompts get the full brand document. Pre-flight is "what the agent knows before talking"; the node is "what the pipeline sees at run time."

### Mandatory pre-build checklist (run BEFORE `build_graph` / `use_essential` / `create_workflow`)

1. **If a URL was given → you MUST add a `websiteResearch` node and run it before building the rest of the pipeline.** Not "offer" — add it. The only exceptions are:
   - The user has explicitly declined in this conversation ("don't scrape", "skip research"), OR
   - The URL is obviously unfetchable (localhost, private, paywalled login).

   In either exception, you MUST instead ask the user for: brand name, one-line tagline, primary color, and any specific product/listing/offering they want featured — and bake those verbatim into every downstream `textAI` prompt via `dataUpdates`.

2. **Brand imagery is mandatory for any branded ad request.** The pre-flight research phase above should have already surfaced candidate image URLs from the site. Your job here is to get the user's pick: "Which of these images should we anchor on? Or paste a different URL." The chosen image(s) become `imageInput` node(s) wired into the ad pipeline per the "TikTok 3-scene branded ad" pattern in [rules/workflow-patterns.md](rules/workflow-patterns.md). If the site had no usable images AND the user declines to provide one, note that the output will look generic and proceed — but this should be rare, because the pre-flight phase usually finds at least a logo or `og:image`.

3. **Never invent concrete facts.** If the user hasn't told you the city, price, square footage, product SKU, menu item, or any other specific, DO NOT write it into a prompt. Describe the scene and style, and let the brand name + real scraped context carry the specificity. Fabricated listings ("Malibu. Six bedrooms. Twenty-two million.") are a bug — the user will notice and lose trust. If you need a specific to make the concept land, ASK the user or pull it from `websiteResearch` output.

4. **Retrofit brand context into essentials.** When you copy an essential via `use_essential`, it will NOT include `websiteResearch`. You MUST add it and wire its outputs into the essential's `textAI` / `imageAI` nodes before validating. See [rules/workflow-patterns.md](rules/workflow-patterns.md) → "Retrofitting brand context into an essential".

### Concept naming

- Name concepts with the brand embedded: "Sotheby's golden-hour glide" ✓, "Golden-hour glide" ✗.
- Never propose a concept that would work for any business. If the pitch could be copy-pasted to a restaurant or a SaaS, rewrite it.

This rule applies for the entire conversation once established — you don't get to "forget" the brand between turns.

## Concept-refinement phase (before `build_graph`)

For any marketing / ad / short-form video request, you MUST produce a **concept brief** and show it to the user before calling `build_graph` / `use_essential`. The brief is a 3-scene TikTok-native structure:

- **Scene 1 — Hook (0–3 s)**: what stops the scroll. One-line visual beat + on-screen text (if any).
- **Scene 2 — Payoff (3–10 s)**: the product / service in action. One-line visual beat + voiceover line (if voiceover enabled).
- **Scene 3 — CTA (10–15 s)**: the call to action. One-line visual beat + on-screen text or voiceover line.

Each scene names: the shot, the on-screen text (if any), the voiceover line (if any), and whether the user-provided image (logo / product / hero) appears.

Example brief shape (show the user this structure):

> **Concept: "<Brand> <hook name>"**
> - **Hook (0–3 s)**: Close-up on [visual]. On-screen text: "[hook line]". Logo micro-flash.
> - **Payoff (3–10 s)**: [product / service in action]. Voiceover: "[one line]".
> - **CTA (10–15 s)**: [final shot]. On-screen text: "[CTA]". Logo + URL.

Only after the user approves the brief (or edits it) do you call `build_graph`. Do not skip this step — a flat pipeline without scene structure produces generic "any business" output and the user will reject it.

## Polling workflow execution

When you call `run_workflow`, it returns `{ run_id, status: "running" }` and starts execution in the background. You MUST enter a polling loop:

1. Call `get_workflow_run_status({ run_id })` every 5 seconds.
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
- `get_trend_inspiration` — fetch trending content references for ideation

### Workflow management

- `create_workflow` / `get_workflow` / `list_workflows` / `update_workflow` / `delete_workflow` / `duplicate_workflow`

### Graph building

- `build_graph` — **THE ONLY graph mutation tool.** Atomic batch ops: `addNodes`, `addEdges`, `dataUpdates` (partial merge), `removeNodeIds`, `removeEdgeIds`. Supports `tempId` references for edges to newly-added nodes. Auto-positions in a clean DAG layout.
- `organize_layout` — opt-in full re-layout pass (dagre). Overwrites positions.
- `validate_workflow` — check for issues AND warnings before execution. If warnings are present, ask the user about them before running.

### Execution (costs credits)

- `run_node` — execute a single node (default — follow `_agentInstructions` in each response)
- `run_workflow` — execute entire workflow (requires `userConfirmed: true`). Returns `{ run_id }`; you MUST poll `get_workflow_run_status({ run_id })` every 5s until terminal.
- `get_workflow_run_status` — poll a running workflow for per-node status, errors, and credits charged
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
