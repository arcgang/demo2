# demo2

## API Contract: Upgrade Eligibility

This section is the standalone reference for frontend consumers of the upgrade-eligibility API.

### Authentication

All eligibility endpoints require an `Authorization: Bearer <token>` header.  
Missing or unrecognised tokens return **HTTP 401**:

```json
{ "errorCode": "UNAUTHORIZED", "message": "Authorization header with Bearer token is required." }
```

### Demo tokens (deterministic seeds)

| Token | Customer ID | Outcome |
|---|---|---|
| `token_eligible` | `cust_demo_eligible` | `ELIGIBLE` — contract ends ~60 days out |
| `token_cond` | `cust_demo_cond` | `CONDITIONALLY_ELIGIBLE` — contract ends ~106 days out |
| `token_not_eligible` | `cust_demo_not_eligible` | `NOT_ELIGIBLE` — contract ends ~242 days out |

---

### GET /api/upgrade/eligibility

Returns the authenticated customer's upgrade eligibility state.

**Request**

```
GET /api/upgrade/eligibility
Authorization: Bearer <token>
```

**200 Response — EligibilityResult**

```json
{
  "status": "ELIGIBLE | CONDITIONALLY_ELIGIBLE | NOT_ELIGIBLE",
  "currentPlan": {
    "name": "string",
    "monthlyCost": 799.00,
    "contractEndDate": "YYYY-MM-DD"
  },
  "nextStepGuidance": ["string"],
  "availableUpgradeOfferIds": ["string"]
}
```

**Field rules:**

| Field | ELIGIBLE | CONDITIONALLY_ELIGIBLE | NOT_ELIGIBLE |
|---|---|---|---|
| `status` | `"ELIGIBLE"` | `"CONDITIONALLY_ELIGIBLE"` | `"NOT_ELIGIBLE"` |
| `nextStepGuidance` | `[]` (empty) | Non-empty array of guidance strings | Non-empty — always includes `"Contact Support"` and `"View your current plan"` |
| `availableUpgradeOfferIds` | Non-empty array of offer ID strings | `[]` (empty) | `[]` (empty) |

**Logic (TMF637-aligned mock):**

- Contract end date ≤ 90 days from today → `ELIGIBLE`
- Contract end date 91–180 days → `CONDITIONALLY_ELIGIBLE`
- Contract end date > 180 days → `NOT_ELIGIBLE`

---

### POST /api/carts/:cartId/items — eligibility gate

When any line in the request has `lineType: "UPGRADE_OFFER"`, the endpoint checks eligibility for the authenticated customer.

**Request**

```
POST /api/carts/:cartId/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "lines": [
    { "lineType": "UPGRADE_OFFER", "productId": "offer_upgrade_only_001", "quantity": 1 }
  ]
}
```

**403 Response — NOT_ELIGIBLE customer**

Full `EligibilityResult` payload as the response body (same shape as above).

```json
{
  "status": "NOT_ELIGIBLE",
  "currentPlan": { "name": "Basic Connect 5GB", "monthlyCost": 249.00, "contractEndDate": "2027-04-01" },
  "nextStepGuidance": ["Contact Support", "View your current plan"],
  "availableUpgradeOfferIds": []
}
```

**200 Response — ELIGIBLE or CONDITIONALLY_ELIGIBLE customer**

```json
{
  "cartId": "string",
  "status": "UPDATED",
  "eligibility": {
    "status": "ELIGIBLE | CONDITIONALLY_ELIGIBLE",
    "currentPlan": { "name": "string", "monthlyCost": 799.00, "contractEndDate": "YYYY-MM-DD" },
    "nextStepGuidance": ["string"],
    "availableUpgradeOfferIds": ["string"]
  }
}
```

The `eligibility` field is always present on upgrade-offer cart adds so the frontend can surface appropriate UX for `CONDITIONALLY_ELIGIBLE` customers without a separate eligibility call.

**Non-upgrade cart lines** (no `lineType: "UPGRADE_OFFER"`) bypass the eligibility gate and return `{ "cartId": "...", "status": "UPDATED" }`.
