# Products (API Publishing)

Workflows can be published as Products — REST API endpoints that external applications can call.

## Publishing flow

1. **Build and test the workflow** — make sure it runs correctly
2. **Mark API inputs/outputs** with `set_product_inputs`:
   - `product_inputs`: input nodes that callers provide values for
   - `product_outputs`: terminal nodes whose outputs are returned to callers
3. **Publish** with `publish_product`:
   - Generates a URL slug and API endpoint
   - Creates an API key if the user doesn't have one
   - Returns: `slug`, `endpoint_url`, `schema_url`, `estimate_url`
4. **Share the endpoint** — callers use the API key + endpoint URL

## Configuring publish options

`publish_product` and `republish_product` accept:

- `exposed_inputs` — map of node IDs to fields that API callers can set
- `allowed_models` — which models callers can override (with allowed list)
- `allowed_configs` — which config fields callers can override
- `gate_config` — per-gate behavior in API runs (`auto_approve`, `skip`, or `fail`)

### Gate nodes in published workflows

Gate nodes are **human-in-the-loop candidate selectors** in the studio (see [workflow-patterns.md](workflow-patterns.md) → "Human-in-the-loop gate before expensive steps"). In a published Product they behave two different ways depending on how the product is consumed:

**1. Custom product pages (web form consumers).** Gates render as candidate galleries via `<ProductGate />`. Two fields on the gate node drive the rendering:

- `productLabel` — user-facing heading shown above the gallery (e.g. "Pick your hero frame")
- `productName` — semantic slug used to address the gate in a custom page: `<ProductGate name="hero-frame" />`

Always set both when publishing. Without `productName`, the default page still renders the gate but custom pages can't target it by name. Without `productLabel`, the UI falls back to a generic "Gate" heading.

**2. API consumers (`run_workflow` via REST).** There is no human to click — the server resolves each gate via the `gate_config` map:

- `auto_approve` (default) — pass the **most recent** upstream output straight through. This is what you want for almost every API-published workflow.
- `skip` — same pass-through behavior, softer semantic (the gate is ignored without error).
- `fail` — hard error; the API run aborts at this node. Use only when human approval is genuinely mandatory and the workflow should not run via API.

When publishing a workflow that contains gates, always explicitly set `gate_config` on every gate node — don't rely on the default map being populated by the client. Leaving a gate out of `gate_config` still falls through to `auto_approve`, but being explicit keeps behavior obvious when you come back to the workflow later.

## API keys

- `create_api_key` — creates a new key (raw key shown only once)
- `list_api_keys` — shows prefix and status (not full key)
- `revoke_api_key` — permanently disables a key

First publish auto-generates a key if the user has none.

## Monitoring runs

- `get_run_status({ run_id })` — status, outputs, credits consumed, timing
- `list_runs({ slug })` — recent runs for a published product

## Updating a published product

Use `republish_product` with the same slug — creates a new version while keeping the endpoint URL stable.

## Unpublishing

`unpublish_product({ slug })` — deactivates the endpoint. In-flight runs complete normally.

## Schema inspection

`get_product_schema({ slug })` — returns the full API contract: expected inputs, available model overrides, output structure, and endpoint URLs. Useful for building integrations.
