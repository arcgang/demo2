# docs/

This directory holds machine-readable specification artifacts for the demo2 MVP.

---

## traceability-matrix.json

`traceability-matrix.json` maps every MVP user story to its TM Forum-aligned business
capabilities and named external dependency boundaries. Downstream teams use it to validate
that all four demo journeys and all eleven external integration points are covered before a
release, and to extend coverage as new stories are added.

### Schema

The root object has three fields:

| Field | Type | Description |
|---|---|---|
| `version` | string | Semantic version of the matrix schema (e.g. `"1.0.0"`). Increment the minor version when adding stories; the major version when the schema itself changes. |
| `generatedAt` | string (ISO-8601) | Timestamp when this file was last regenerated. |
| `stories` | array of Story | Ordered list of user story entries. |

Each **Story** entry has the following fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique story identifier matching the pattern `US-NNN` (e.g. `US-001`). Must be unique across the entire matrix. |
| `title` | string | Short human-readable title for the user story. |
| `acceptanceCriteriaRefs` | string[] | One or more acceptance-criteria strings referencing the specific, testable conditions that must be met. Format: `"AC-<AREA>-<NN>: <prose description>"`. Must be non-empty. |
| `tmfCapabilities` | string[] | One or more TM Forum Open API standard references that this story exercises. All values must come from the allowed set (see below). Must be non-empty. |
| `dependencyNames` | string[] | One or more named external dependency boundaries that this story crosses at runtime. All values must come from the allowed set (see below). Must be non-empty. |
| `journeyIds` | string[] | One or more of the four canonical demo journey identifiers that this story belongs to: `purchase`, `onboarding`, `upgrade`, `activation`. Must be non-empty. |

### Allowed TMF Capability Keys

| Key | TM Forum Standard |
|---|---|
| `TMF620` | Product Catalog Management API |
| `TMF622` | Product Ordering Management API |
| `TMF632` | Party Management API |
| `TMF637` | Product Inventory Management API |
| `TMF666` | Account Management API |
| `TMF676` | Payment Management API |
| `TMF663` | Shopping Cart Management API |
| `TMF669` | Party Role Management API |

### Allowed External Dependency Boundary Names

| Name | Description |
|---|---|
| `Identity Service` | Authenticates and resolves customer identity at session initiation |
| `PSP Tokenization` | Payment Service Provider vault — tokenizes card details, never stores raw PAN |
| `Mobile Money Provider` | Alternative payment rail for mobile-money settlement (e.g. M-Pesa) |
| `KYC/RICA Verification` | Know-Your-Customer / RICA identity verification for SIM registration compliance |
| `Financing Service` | Credit-bureau-backed instalment plan quoting for device financing |
| `Trade-In Valuation` | Device trade-in assessment and value estimation service |
| `Activation Status` | eSIM profile provisioning and activation lifecycle status feed |
| `Catalog/Offer Source` | Product and offer catalog — source of truth for plans, bundles, and promotions |
| `Order Submission` | Downstream order management system that receives confirmed orders |
| `Consent/Audit Sink` | Immutable store for consent records and journey audit events |
| `Personalization Rule Boundary` | Rules engine that scopes and ranks offers by customer segment and context |

### Coverage requirements

- All four demo journeys (`purchase`, `onboarding`, `upgrade`, `activation`) must be covered
  by at least one story each.
- All eleven external dependency boundaries must appear at least once across the full story
  set (serves as a functional-requirement coverage proxy per Section 2.2 of the HLD).
- `purchase` and `onboarding` and `upgrade` journeys must each have at least three covering
  stories; `activation` must have at least one.
- At least twelve stories must be present in total.

### Extending the matrix

1. Add a new story object to the `stories` array.
2. Assign the next sequential `id` (`US-NNN`).
3. Populate all six required fields — at minimum one entry each in
   `acceptanceCriteriaRefs`, `tmfCapabilities`, `dependencyNames`, and `journeyIds`.
4. Use only values from the allowed TMF capability key list and the allowed dependency name
   list. New boundaries or standards require a schema-version bump and a PR updating this
   README.
5. Update `generatedAt` to the current ISO-8601 timestamp.
6. Run the acceptance test suite (`npx jest traceability-matrix`) to verify 100% coverage
   before merging.
