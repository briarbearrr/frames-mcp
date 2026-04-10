# Budget-Aware Recommendations

Load this file when the user asks an ideation question scoped to a budget — e.g., "what can I build for $2?", "what's possible with 500 credits?", "ideas for 1000 credits", "show me options under $5", "what marketing video can I build with $1", "what should I make with my budget?".

Your job: return a **single ranked list of 4–6 creative concepts**. Every concept names the pipeline that realizes it — a saved user workflow, a published product, an Essential, a template, or a custom build. No buckets, no section headers. The user sees one list of ideas, each with a clear "uses X" realization line.

## Step 1 — Call `discover_options` FIRST (non-skippable)

Every budget question starts with exactly one call:

```
discover_options({
  budget: <dollars or credits from user>,
  include?: <required node types from intent>,
  exclude?: <disallowed node types from intent>,
})
```

**Red flag — stop and restart:** If you are about to list options, propose builds, or describe "what you could make" without having called `discover_options` in this turn, STOP. `discover_options` is the only source of truth for the user's workflows, products, essentials, and templates. Do not substitute it with memory, `get_pricing`, or `list_workflows`.

**Intent → filter mapping:**

| User says                          | Set                            |
| ---------------------------------- | ------------------------------ |
| "product video", "marketing video" | `include: ["videoAI"]`         |
| "voiceover", "narration"           | `include: ["voiceAI"]`         |
| "slideshow"                        | `include: ["slideshow"]`       |
| "captions", "subtitled"            | `include: ["videoCaptions"]`   |
| "brand analysis", "from my site"   | `include: ["websiteResearch"]` |
| "no captions"                      | `exclude: ["videoCaptions"]`   |
| "image only", "no video"           | `exclude: ["videoAI"]`         |
| "no voice"                         | `exclude: ["voiceAI"]`         |

If the intent is generic ("what can I build for $X"), omit `include`/`exclude` and let `discover_options` rank across everything.

**Response shape:**

```
{
  budget, credit_balance,
  options: [
    {
      source_type: 'workflow' | 'product' | 'essential' | 'template',
      source_id, name, description, capabilities: string[],
      estimated_cost, cost_type: 'exact' | 'estimated',
      affordable: boolean,
      action: { tool: 'run_workflow' | 'create_from_template', args: {...} }
    }
  ],
  cheapest_option: <option | null>,  // only when options is empty
  note: string | null,                // explanation when nothing fits
  inventory: {
    workflows_total, workflows_affordable,
    products_total, products_affordable,
    essentials_total, essentials_affordable,
    templates_total, templates_affordable,
  }
}
```

Use `inventory` to decorate empty-bucket headers with the real reason (see Step 2).

## Step 2 — Unify everything into a single concept list

There are no separate buckets. Every recommendation the user sees is a **creative concept**, and every concept names which pipeline realizes it. The realization is either a library item (a user workflow, a published product, an Essential, or a template) or a custom build the agent synthesizes.

For each `option` returned by `discover_options`, pitch a concept that *matches the option's fixed topology and capabilities*. You are not free to invent any concept for a library item — the concept must be something that pipeline can actually produce. For a `textInput → textAI → videoAI + voiceAI → audioOverlay` essential, the concept must be a narrated single-clip video, not a multi-scene montage.

Then synthesize 1–2 **custom** concepts (see Step 3) that cover creative territory no library item can reach.

Rank the final list so the strongest fit to the user's intent comes first, regardless of source. Cap at 4–6 concepts total. Do not pad.

**Handling empty inventory:** if `inventory.workflows_total === 0` or no library items match the intent, just say so briefly in the header line ("Your library doesn't have anything matching this yet — here are custom builds.") and proceed with custom concepts. Do not render empty bucket headers.

## Step 3 — Concept-first presentation (library items AND custom builds)

Every concept in your response — whether it's realized by a saved workflow, an Essential, a published product, a template, or a custom build — follows the same concept-first rules below. The difference is only in the **Pipeline** line, which names the realization:

- `uses your "<workflow name>" workflow` → for `source_type === 'workflow'`
- `uses the "<product name>" product` → for `source_type === 'product'` (non-essential)
- `uses the "<essential name>" essential` → for `source_type === 'essential'`
- `uses the "<template name>" template` → for `source_type === 'template'`
- `custom pipeline: <node chain>` → for agent-synthesized builds

Always include at least one custom build in the final list, even when `discover_options` returns plenty of library results. Custom builds are the creative safety valve — they show the user what's possible when no existing pipeline fits.

### Hard rule: no format-only names

❌ **Banned** concept names (these describe a container, not an idea):
- "Slideshow ad", "Hero shot video", "Cinematic product ad"
- "TikTok / Reel ad", "30-second commercial", "Explainer video"
- "Multi-shot ad", "Product demo", "Brand film"

✅ **Required**: the concept name must describe the *idea, hook, or story beat* — what the viewer actually sees and why it stops the scroll. Examples:
- "Frost-crack reveal" (frozen block shatters to expose the product)
- "Liquid morph" (one product pours and re-forms as another)
- "Hands-only ritual" (unboxing and use shot entirely from POV, no talking)
- "Before/after in one take" (camera pans across a split-world transformation)
- "Mirror swap" (reflection reveals a different version of the wearer)
- "Stop-motion flatlay assembly" (ingredients march into place on a marble counter)

### Required pitch structure

Each fresh concept MUST be pitched with exactly these three lines, in order:

1. **Concept (2 sentences max)** — sentence 1: the hook + beat + payoff collapsed into one vivid description of what the viewer sees. Sentence 2: why it trends right now (link to a current pattern from the vocabulary below). No bullet sub-points, no four-beat breakdown — just two sentences total.
2. **Pipeline** — the node chain (e.g. `textInput → textAI → imageAI → videoAI`) with the model tier picked in parentheses.
3. **Est. cost (upper bound)** — a concrete ceiling in credits, derived from `get_pricing` calls (see sizing below). Present as "up to N credits" — never a range, never a lowball.

Only *after* the creative concept is locked in do you describe the pipeline and cost. Cost is a consequence of the concept, never the headline.

### Cost discipline — no ballparks

- **Library items** (workflows / products / essentials / templates): use the `estimated_cost` from `discover_options` directly. The backend returns upper-bound estimates — do not second-guess them. Present as "up to N credits".
- **Custom builds**: you MUST call `get_pricing` in **chain mode** with every AI node in the concept's pipeline before quoting a cost:

  ```
  get_pricing({
    chain: [
      { type: "textAI" },
      { type: "imageAI", config: { aspectRatio: "9:16" } },
      { type: "videoAI", model: "kling-v2-6", config: { mode: "standard", duration: 5, sound: false } }
    ]
  })
  ```

  The response returns `perNode` AND a server-computed `totalUpperBound`. **Use `totalUpperBound` verbatim** — never hand-sum the `perNode` entries. That is how small costs (textAI ≈ 1 credit) get dropped and quotes come out low. Do not eyeball from billing.md tier tables. The quoted number must be the `totalUpperBound`, never a hopeful midpoint.

### Concept vocabulary (draw from these patterns)

These are the trending motifs the Fresh concepts bucket should sample from. Mix and match to fit the user's brand or product:

- **Reveals**: frost-crack, shrink-wrap tear, dust-cloud clear, water-ripple, paper-origami unfold
- **Transforms**: liquid pour morph, stop-motion assembly, time-lapse bloom, split-world before/after, ingredient tornado
- **POV & hands**: unboxing-only-hands, ASMR close-up, desk-top tableau, first-person ritual, mirror reflection
- **Text-first hooks**: text appears before product ("the only X that does Y"), kinetic typography countdown, question-answer reveal
- **Story beats**: "this or that" binary choice, "wait for it" delayed payoff, "things I wish I knew", "POV: you just discovered…"
- **Motion tricks**: match-cut transitions, tracking-shot continuous take, scale-shift (tiny→massive), camera whip-pan between scenes

### Sizing a custom build to the budget

1. Pick a concept from the vocabulary matching the user's intent
2. Pick a pattern from [workflow-patterns.md](workflow-patterns.md) that can realize it
3. Call `get_pricing` for every AI node in the pattern and sum them. Round up. This is the upper bound you quote.
4. **Only propose concepts you can actually fit in the budget** — if the upper bound exceeds it, swap to a cheaper realization (shorter duration, cheaper model tier, fewer nodes)
5. Every concept — library or custom — presents as four lines: **Concept** (2 sentences) → **Pipeline** (realization line) → **Est. cost** (up to N credits) → action line.

## Presentation format

Lead with a single budget-context line, then a ranked list of 4–6 concepts. No section headers. No buckets. Every concept looks the same regardless of whether it's realized by a saved workflow, a product, an essential, a template, or a custom build.

```
Credit balance: <credit_balance>  |  Your budget: <budget>

1. **<Concept name>**
   - Concept: <sentence 1: hook+beat+payoff in one vivid line.> <sentence 2: why it trends right now.>
   - Pipeline: uses your "<workflow name>" workflow
   - Est. cost: up to <N> credits
   - → say "run it" and I'll execute "<workflow name>"

2. **<Concept name>**
   - Concept: <sentence 1.> <sentence 2.>
   - Pipeline: uses the "Narrated Video" essential
   - Est. cost: up to <N> credits
   - → say "use it" and I'll copy the "Narrated Video" essential into your workspace, then run it

3. **<Concept name>**
   - Concept: <sentence 1.> <sentence 2.>
   - Pipeline: custom — `textInput → textAI → imageAI → videoAI` (Kling budget tier)
   - Est. cost: up to <N> credits
   - → say "build it" and I'll assemble the pipeline

4. **<Concept name>**
   - Concept: <sentence 1.> <sentence 2.>
   - Pipeline: uses the "<template name>" template
   - Est. cost: up to <N> credits
   - → say "use it" and I'll create a workflow from "<template name>"
```

**Internal tool calls stay internal.** The user should never see raw UUIDs, tool names, or function-call syntax in the action line. Keep the friendly prompt ("say 'run it'…") on screen and, when the user confirms, call the correct MCP tool with the IDs from the `discover_options` response under the hood. The agent is responsible for remembering which concept maps to which `source_id` when the user says "run it" / "build it" / "use it".

**Essentials need a two-step run.** Essentials (`source_type === 'essential'`) are global seeded pipelines — they live in the `products` table, have no owner, and `run_workflow` / `get_workflow` / `duplicate_workflow` cannot touch them directly. When the user confirms an essential, the agent MUST:

1. Call `use_essential({ essentialId: <source_id> })` to copy the essential into the user's own `workflows` table. This returns a new `workflow_id`.
2. Then call `run_workflow({ workflowId: <new id>, userConfirmed: true, userInputs: {...} })` with that new ID.

This two-step happens silently under the hood — the user just sees "copying 'Narrated Video' into your workspace… running it now." Never show the intermediate tool calls in prose. Workflows, templates, and products (non-essential) keep their normal single-step flows: `run_workflow` / `create_from_template` / `run_workflow`.

**Action-line mapping by source_type:**

| `source_type` | Friendly action line | Under-the-hood calls |
| --- | --- | --- |
| `workflow` | "say 'run it' and I'll execute '<name>'" | `run_workflow` |
| `essential` | "say 'use it' and I'll copy '<name>' into your workspace, then run it" | `use_essential` → `run_workflow` |
| `product` | "say 'run it' and I'll execute '<name>'" | `run_workflow` (on `source_workflow_id`) |
| `template` | "say 'use it' and I'll create a workflow from '<name>'" | `create_from_template` |
| custom | "say 'build it' and I'll assemble the pipeline" | `build_graph` |

**Rules:**

- Always show `credit_balance` and the user's budget on the first line.
- Rank by best fit to the user's intent, not by source type.
- Every concept — library or custom — uses the same 4-line format: **Concept** (2 sentences) → **Pipeline** (realization) → **Est. cost** (up to N credits) → action line.
- The **Pipeline** line MUST identify the realization by name: `uses your "<name>" workflow` / `uses the "<name>" product` / `uses the "<name>" essential` / `uses the "<name>" template` / `custom — <node chain>`. Never show `workflow_id` / `template_id` / UUIDs to the user.
- The **action line** MUST be a plain-English prompt ("say 'run it' and I'll execute…") — never raw tool-call syntax, never a UUID, never a JSON args object. Remember the `source_id` internally for when the user confirms.
- Library costs come from `discover_options` `estimated_cost` directly; custom costs come from `get_pricing` per node, summed and rounded up. Always present as "up to N credits", never a range.
- Mark any concept where the underlying option has `affordable: false` with a trailing "⚠ exceeds your credit balance".
- Always include at least one custom concept in the list, even when library results are plentiful.
- If the user's library has no items matching the intent, open with one sentence ("Your library doesn't have anything matching this yet — here are custom builds.") and proceed.
- Never call `run_workflow` or `build_graph` without explicit user confirmation — this playbook is recommendations only.

## When nothing in the library fits

If `discover_options` returns `options: []`, use `cheapest_option`, `note`, and `inventory`:

1. Tell the user the `note` verbatim ("No options available within X credits. The cheapest option is Y credits.")
2. Still return a ranked concept list — just skip all library concepts and lead straight into custom builds
3. If `cheapest_option` exists, include it as one concept in the list (marked with "⚠ exceeds your credit balance" if `affordable: false`) so the user can see what's closest
4. Propose 1–2 custom concepts — the cheapest possible realizations of trending patterns that match the user's intent (image-only, no video, shortest duration). If even those don't fit the budget, say so explicitly and suggest topping up credits.

## Do not

- Do not skip `discover_options` — ever. It's the only source of truth.
- Do not use bucket headers or separate library items from custom builds. Everything is a single concept list.
- Do not name any concept by its format ("Slideshow ad", "Hero shot", "Cinematic ad") — it must be a creative idea.
- Do not propose a concept you cannot tie to a specific trending pattern from the vocabulary.
- Do not lead a concept with cost or pipeline — lead with the 2-sentence Concept line.
- Do not expand the concept into a 4-beat breakdown. Two sentences, total.
- Do not invent a concept for a library item that its fixed pipeline can't actually produce.
- Do not quote a custom-build cost without calling `get_pricing({ chain: [...] })` first. Use `totalUpperBound` verbatim — no hand-summing, no ballparks.
- Do not present a cost as a range ("15–20 credits") — always a single upper bound ("up to 20 credits").
- Do not show UUIDs, raw tool names, or JSON tool-call syntax to the user. Action lines are plain English.
- Do not execute anything (`run_workflow`, `build_graph`) without explicit user confirmation.
- Do not invent workflows or products that aren't in the `discover_options` response.
- Do not present more than 6 concepts total — overwhelm kills ideation.
- Do not propose a concept that ignores the user's stated brand, industry, or URL. Every concept must be specific to their business — if you could copy-paste the pitch to any other company, it isn't specific enough. Name the brand in the concept name.
