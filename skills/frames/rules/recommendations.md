# Budget-Aware Recommendations

Load this file when the user asks an ideation question scoped to a budget — e.g., "what can I build for $2?", "what's possible with 500 credits?", "ideas for 1000 credits", "show me options under $5", "what should I make with my budget?".

Your job: return a **mix of options across three buckets** — the user's own pipelines, Frames products & essentials, and 1–2 fresh custom build ideas — so the user sees both what already exists and what could be built new.

## Step 1 — Call `discover_options`

Start every budget question with a single call:

```
discover_options({
  budget: <dollars or credits from user>,
  include?: <required node types from intent>,
  exclude?: <disallowed node types from intent>,
})
```

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
  note: string | null                 // explanation when nothing fits
}
```

## Step 2 — Group results into three buckets

Split `options` by `source_type`:

- **Your pipelines** ← `source_type === 'workflow'`
- **Products & Essentials** ← `source_type === 'product' || source_type === 'essential'`
- **Starting points** (fold into bucket 3) ← `source_type === 'template'` — present as "ready-to-customize templates" alongside your custom builds

Max 2–4 options per bucket. If a bucket is empty, skip it entirely — don't pad with unrelated picks.

## Step 3 — Synthesize 1–2 custom builds

Always propose at least one **from-scratch custom build** tailored to the user's intent, even when `discover_options` returns plenty of results. The point of this bucket is to show what's possible if nothing existing is a perfect fit.

How to synthesize:

1. Pick a pattern from [workflow-patterns.md](workflow-patterns.md) matching the intent (simple text-to-video, product photo → marketing video, brand analysis → video, multi-scene story, etc.)
2. Estimate cost: either call `get_pricing` for each AI node's model, or reference the tier costs in [billing.md](billing.md) for a quick ballpark
3. **Only propose custom builds within budget** — if your minimum viable build exceeds the budget, say so and suggest a cheaper pattern (e.g., image-only instead of video, shorter duration, cheaper model tier)
4. Present each custom build with:
   - Name + one-line description
   - Node chain (e.g., `textInput → textAI → imageAI → videoAI`)
   - Estimated cost + which model tier you picked
   - Explicit next step: "Say 'build it' and I'll run `build_graph` with this topology"

## Presentation format

Lead with budget context, then the three buckets:

```
Credit balance: <credit_balance>  |  Your budget: <budget>  |  Headroom: <budget - cheapest option>

**Your pipelines**
1. <name> — <cost> credits — <one-line> → run via `run_workflow({ workflow_id: ... })`
2. ...

**Products & Essentials**
1. <name> — <cost> credits — <one-line> → run via `run_workflow({ workflow_id: ... })`
2. ...

**Custom builds & templates**
1. <custom build name> — ~<cost> credits — <node chain> → say the word and I'll `build_graph`
2. <template name> — <cost> credits — <one-line> → `create_from_template({ template_id: ... })`
```

**Rules:**

- Always show `credit_balance` and the user's budget side by side
- Mark any option where `affordable: false` with a clear "⚠ exceeds your credit balance" note
- Every option MUST include the exact next tool call (from `action` for discover_options results, or `build_graph` for custom builds) so the user can act with one message
- Never call `run_workflow` without explicit user confirmation — this playbook is recommendations only
- Costs from `discover_options` where `cost_type === 'estimated'` should be shown with a `~` prefix

## When nothing fits

If `discover_options` returns `options: []`, use `cheapest_option` and `note` from the response:

1. Tell the user the note verbatim ("No options available within X credits. The cheapest option is Y credits.")
2. Show the `cheapest_option` as a stretch pick
3. Still propose 1 custom build — the cheapest possible pattern that matches their intent (image-only, no video, shortest duration). If even that doesn't fit, say so and suggest topping up credits via `get_credit_balance` / the Frames dashboard

## Do not

- Do not skip `discover_options` — it's the only source of truth for user workflows + products + templates
- Do not execute anything (`run_workflow`, `build_graph`) without explicit user confirmation
- Do not invent workflows or products that aren't in the `discover_options` response — only custom builds are agent-generated, and they must be clearly labeled as such
- Do not present more than 4 options per bucket — overwhelm kills ideation
