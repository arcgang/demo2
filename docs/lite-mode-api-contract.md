# Lite-Mode API Contract

## Overview

Lite mode returns reduced-payload responses from the catalog list and product detail endpoints. It is designed for low-bandwidth browsing and progressive enhancement scenarios.

## Activation

Lite mode is activated on any request by either of these mechanisms:

| Mechanism | Value |
|---|---|
| Query parameter | `?lite=true` |
| HTTP header | `Save-Data: on` |

Both mechanisms are equivalent. Either activates the trimmed response for that request.

## Affected Endpoints

| Endpoint | Method |
|---|---|
| `/api/catalog/products` | GET |
| `/api/catalog/products/:id` | GET |

## Lite Response Shape

### Catalog List — `GET /api/catalog/products?lite=true`

Each item in the `catalog` array contains exactly:

```json
{
  "productId": "prod_za_iphone15_128",
  "name": "iPhone 15 128GB",
  "price": {
    "onceOff": 18999,
    "currency": "ZAR"
  },
  "monthlyFrom": 599,
  "availability": "AVAILABLE",
  "category": "DEVICE",
  "storageOptions": ["128GB"],
  "colorOptions": ["Midnight"],
  "planAttachOptions": ["plan_za_red_essential_20gb", "plan_za_red_premium_50gb"],
  "esim": true,
  "fiveG": true,
  "tradeIn": true
}
```

### Product Detail — `GET /api/catalog/products/:id?lite=true`

The response body contains exactly:

```json
{
  "productId": "prod_za_iphone15_128",
  "name": "iPhone 15 128GB",
  "price": {
    "onceOff": 18999,
    "currency": "ZAR"
  },
  "monthlyFrom": 599,
  "availability": "AVAILABLE",
  "category": "DEVICE",
  "storageOptions": ["128GB"],
  "colorOptions": ["Midnight"],
  "planAttachOptions": ["plan_za_red_essential_20gb", "plan_za_red_premium_50gb"],
  "esim": true,
  "fiveG": true,
  "tradeIn": true
}
```

## Included Fields

| Field | Type | Notes |
|---|---|---|
| `productId` | string | Unique product identifier |
| `name` | string | Display name |
| `price` | object | `onceOff` (when > 0), `recurring` (when > 0), and `currency` |
| `monthlyFrom` | number | Lowest recurring price among compatible plans; 0 if none |
| `availability` | string | Availability status, e.g. `AVAILABLE` |
| `category` | string | Product type: `DEVICE`, `PLAN`, `BUNDLE`, `SIM`, `ESIM`, `ACCESSORY` |
| `storageOptions` | string[] | Storage SKU values from product metadata; empty array if not applicable |
| `colorOptions` | string[] | Colour values from product metadata; empty array if not applicable |
| `planAttachOptions` | string[] | Compatible plan product IDs; empty array if none |
| `esim` | boolean | `true` when product metadata `simType` equals `ESIM` |
| `fiveG` | boolean | `true` when product badges include `5G` |
| `tradeIn` | boolean | `true` when product badges include `Trade-In Eligible` |

## Omitted Fields

The following fields present in the full response are absent from lite responses:

| Field | Reason for omission |
|---|---|
| `tax` / `taxBreakdown` | Unnecessary for browse; resolved at checkout |
| `spec` / `metadata` | Marketing copy and technical detail; deferred to full PDP |
| `isPurchasable` | Computed from payment method context; not required for listing |
| `recommendedAccessories` | Recommendation payload; loaded on demand |
| `personalizedRecommendations` | Consent-aware recommendations; loaded on demand |
| `onboardingRequirements` | Journey gating detail; relevant only at offer configuration |
| `compatibleOffers` (full detail form) | Rich offer objects; `planAttachOptions` IDs are sufficient |

## Non-Lite (Full) Behaviour

Requests without `?lite=true` and without the `Save-Data: on` header continue to return the full payload unchanged. Lite mode has no effect on non-catalog endpoints.
