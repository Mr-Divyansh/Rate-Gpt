# Rate GPT — REST API Contract

**Local base URL:** `http://localhost:5000/api/v1`  
**Production URL:** configure at deployment. `https://api.rategpt.app/v1` is only a proposed example, not a confirmed live service.

## Common success envelope
```json
{
  "success": true,
  "data": [],
  "meta": { "limit": 50, "offset": 0, "total": 0, "hasNext": false }
}
```

## Common error
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid query parameters" }
}
```

## Endpoints

### 1. Health
`GET /health`  
Returns application and database status. Do not expose credentials or sensitive infrastructure details.

### 2. Filter metadata
`GET /meta/filters?state=...&district=...&search=...`  
Returns available states, districts, markets and commodity suggestions.

### 3. Latest prices
`GET /prices`  
Optional query parameters: `state`, `district`, `market`, `commodity`, `variety`, `date`, `limit`, `offset`, `sort`. Default limit 50, maximum 100. Sort values: `modal_price_asc`, `modal_price_desc`, `market_asc`.

### 4. Price trend
`GET /prices/trend`  
Required: `state`, `district`, `market`, `commodity`. Optional: `from`, `to` in `YYYY-MM-DD` format. Return only actual stored points.

### 5. Commodity search
`GET /commodities/search?q=tom&limit=10`  
Require a non-empty query and cap the result count.

### 6. Admin sync
`POST /admin/sync`  
Protected endpoint. Validate request body and require admin authentication. Prefer background execution with a sync identifier.

## Status codes
- `200` success
- `400` invalid parameters
- `401` missing/invalid admin authentication
- `404` resource not found where appropriate
- `429` rate limit exceeded
- `500` internal error
- `502` upstream Government API failure

## Rules
Validate every input, cap pagination, use consistent response envelopes, never expose API keys and document the implemented contract with OpenAPI.
