# Billing and Credits

## Checking balance

```
get_credit_balance()
```

Returns `{ balance: number, currency: "credits" }`. Always check before suggesting execution.

## Pricing lookup

```
get_pricing({
  operation: "text-generation",  // optional filter
  model: "gemini-2.5-flash"     // optional filter
})
```

Returns pricing entries with: `operation`, `model`, `configKey`, `billingUnit` (per_call, per_second, per_character), `credits`, `description`.

Common operations:

- `text-generation` — textAI, storyAI
- `image-generation` — imageAI
- `video-generation` — videoAI
- `voice-synthesis` — voiceAI

## Cost estimation for products

```
estimate_product_cost({
  slug: "my-published-workflow",
  model_overrides: { "node-id": "kling-2.0" }  // optional
})
```

Returns per-node and total credit cost estimate for a published workflow.

## Cost guidance

- Text generation is cheapest (fractions of a credit)
- Image generation is moderate
- Video generation is most expensive — especially pro mode and longer durations
- Voice synthesis costs depend on text length (per_character billing)

When the user asks to run something, give them a rough cost estimate first:

1. Look up pricing for the relevant operations/models
2. Mention the approximate total
3. Ask for confirmation before executing
