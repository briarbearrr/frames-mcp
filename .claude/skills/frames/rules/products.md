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
- `gate_config` — how gate nodes behave in API runs (`auto_approve`, `skip`, `fail`)

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
