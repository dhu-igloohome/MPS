# Foretracker Integration API — Partner Guide

**Prepared for:** Berfin  
**Purpose:** Connect your inventory management application to Foretracker (MPS) and read global inventory data.  
**Access:** Read-only. This API cannot create or modify data in Foretracker.

---

## 1. What you will receive from your administrator

| Item | Description |
|------|-------------|
| **API key** | A secret string starting with `mps_` (shown only once at creation) |
| **Site URL** | The production address of Foretracker, e.g. `https://your-company-site.vercel.app` |

Store the API key in a **server-side environment variable** (e.g. `FORETRACKER_API_KEY`).  
Do **not** expose it in browser code, mobile apps, or public Git repositories.

---

## 2. Authentication

Include this header on **every** request:

```
Authorization: Bearer mps_YOUR_API_KEY_HERE
```

Replace `mps_YOUR_API_KEY_HERE` with the key your administrator provided.

---

## 3. Endpoints

Base URL: `https://YOUR-SITE-URL` (replace with the URL you were given)

### 3.1 Health check (test your connection)

```
GET /api/integrations/v1/health
```

**Example (curl)**

```bash
curl -H "Authorization: Bearer mps_YOUR_API_KEY_HERE" \
  "https://YOUR-SITE-URL/api/integrations/v1/health"
```

**Success response**

```json
{
  "ok": true,
  "label": "Berfin",
  "scopes": ["inventory:read"]
}
```

Run this first. If you see `"ok": true`, your key and URL are correct.

---

### 3.2 Global inventory (read-only)

Returns the same data as **Logistics → Inventory Global** inside Foretracker.

```
GET /api/integrations/v1/inventory-global
```

**Optional filter by main SKU**

```
GET /api/integrations/v1/inventory-global?mainSku=DAX6E
```

**Example (curl)**

```bash
curl -H "Authorization: Bearer mps_YOUR_API_KEY_HERE" \
  "https://YOUR-SITE-URL/api/integrations/v1/inventory-global"
```

**Success response (structure)**

```json
{
  "ok": true,
  "count": 42,
  "fetchedAt": "2026-06-12T09:00:00.000Z",
  "entries": [
    {
      "id": "1",
      "mainSku": "DAX6E",
      "variantSku": "",
      "batch": "",
      "stockQtyAvailableForFulfillment": 100,
      "reservedQty": 0,
      "dkksFactory": 0,
      "huiliFactory": 0,
      "shenzhenOffice": 0,
      "singaporeOffice": 0,
      "inTransitStock": 0,
      "unitPriceUsd": 46.0,
      "skuInventoryCostUsd": 0
    }
  ]
}
```

Each object in `entries` includes warehouse quantities, batch info, and cost fields. The full field list matches the Foretracker Inventory Global table.

---

### 3.3 Order fulfillments (read-only)

Returns **Order Fulfillments** data from Foretracker: every Forecast # + SKU group (regardless of stage), plus shipment rows (SO, ETD/ETA, delivery status, etc.) for the ones that already have contracts.

Each group includes `contractedQty` — this is `0` for forecast-stage demand that has no contract yet, and > 0 once a contract has been created against it. Use this to distinguish confirmed vs. tentative demand in your dashboard.

Each group also includes `opsActions` and `comments` — arrays of the distinct, non-empty Ops action / comment values from the underlying forecast line(s) for that Forecast # + SKU + month. This is an array (not a single string) because one group can be backed by more than one forecast row — Foretracker splits a single forecast entry into separate Build-to-Order and Build-to-Stock rows when both are filled in, and each row carries its own Ops action independently. In the common case there's exactly one row, so the array has 0 or 1 items; check `opsActions.includes("Consider stock transfer from other region")` (or whichever value you're flagging) rather than assuming a single string.

Requires scope: **`fulfillment:read`**

```
GET /api/integrations/v1/order-fulfillments
```

**Optional filters**

| Query param | Example | Description |
|-------------|---------|-------------|
| `region` | `EU` | `APAC`, `EU`, or `USA` (case-insensitive). Unrecognized values are ignored (no filter applied). |
| `forecastMonth` | `2026-09` | YYYY-MM |
| `sku` | `DAX6E` | SKU |
| `forecastPoNumber` | `POU202606020002` | Forecast PO # |

Every object in `groups` and `shipments` also includes a `"region"` field so you can filter or label rows client-side even without the `region` param.

**Shared buffer stock ("OPS Department")** — a Buffer Stock forecast can be created before anyone knows which region will consume it, so it is parked under the region `"OPS Department"` and works as a shared pool. The pool itself has no region, but **every shipment that draws from it declares the region it is going to**:

- A **group** backed by the pool has `"region": "OPS Department"`, so it does **not** show up under `?region=EU` (or any real region) — it isn't any one region's demand.
- A **shipment** drawing from the pool carries the **destination region** it was assigned (`"APAC"`, `"EU"` or `"USA"`), and `?region=EU` returns exactly the shipments assigned to EU. The shipment's `forecastPoNumber` still starts with `POO…`, so don't infer the region from the PO prefix — use the `region` field.
- For all other groups, a shipment's `region` is simply its group's region (unchanged).
- Only old shipments that were saved before this rule existed and never got a region can still show `"region": "OPS Department"`; they will be assigned over time.
- **Side effect of `?region=`:** because the pool group is filtered out under `?region=EU` while its shipments are not, a shipment can come back **without its group** in the same response. Don't require every shipment to have a matching group when you filter by region — or call without `region` (the pool group then comes back with `"region": "OPS Department"`) and filter on your side.
- **Do not add pool and regional demand together.** The pool PO is *supply* (stock bought ahead, e.g. 5,000 units); a regional forecast marked `"Consider stock transfer from other region"` is *demand* that the pool is meant to cover (it usually has `contractedQty: 0`). Foretracker records that a shipment is **drawn from the pool and going to region X**, but not which regional forecast line it serves — that allocation has to be done on your side.

**Example (curl)**

```bash
curl -H "Authorization: Bearer mps_YOUR_API_KEY_HERE" \
  "https://YOUR-SITE-URL/api/integrations/v1/order-fulfillments?sku=DAX6E"
```

**Success response (structure)**

```json
{
  "ok": true,
  "groupCount": 3,
  "shipmentCount": 5,
  "fetchedAt": "2026-06-12T09:00:00.000Z",
  "groups": [
    {
      "forecastPoNumber": "POU202606020002",
      "sku": "DAX6E",
      "forecastMonth": "2026-09",
      "productName": "Deadbolt Dash",
      "region": "USA",
      "forecastQty": 500,
      "contractedQty": 500,
      "contractDeliveryDate": "2026-08-20",
      "mpBatches": ["B001"],
      "shipFroms": ["TAIWAN FU HSING"],
      "opsActions": ["Ok to issue PO"],
      "comments": []
    }
  ],
  "shipments": [
    {
      "id": "12",
      "forecastPoNumber": "POU202606020002",
      "sku": "DAX6E",
      "forecastMonth": "2026-09",
      "region": "USA",
      "soNumber": "SO-12345",
      "soQuantity": 200,
      "freightMode": "sea",
      "shipTo": "Singapore",
      "estimatedReadyDate": "2026-07-29",
      "etd": "2026-08-01",
      "eta": "2026-08-15",
      "deliveryStatus": "In transit",
      "trackingLink": "https://..."
    }
  ]
}
```

- **`groups`** — one row per Forecast # + SKU, from all forecast records (not just ones with contracts); check `contractedQty` to see whether a contract has been created yet. `contractDeliveryDate` (`YYYY-MM-DD`, or `null` when there is no contract) is the earliest supplier delivery date among the group's contracts — when the goods are expected to be ready
- **`shipments`** — one row per shipment entry (SO, dates, status); multiple shipments can share the same group  

**Not every shipment has dates yet.** A shipment is created as soon as an SO exists, long before it ships. While `deliveryStatus` is `"In preparation"` (or `"Pending trigger SO"`), `etd`, `eta` and `trackingLink` are normally **`null` / empty** — that is a real, open shipment, not incomplete data. Please do **not** skip or hide rows because `etd`/`eta` is `null`. For these rows use `estimatedReadyDate` (`YYYY-MM-DD` or `null`: when the goods are expected to be ready) and `deliveryStatus` to place them. `etd`/`eta` get filled in when the shipment leaves. The API applies **no status filter** — every shipment is returned, including `"Delivered"` ones; filter on your side if you only want open ones.

`deliveryStatus` is one of: `"In preparation"`, `"Pending trigger SO"`, `"In transit"`, `"Delivered"`, or `""` (not set yet).

---

## 4. Example: Node.js / server-side JavaScript

```javascript
const API_KEY = process.env.FORETRACKER_API_KEY;
const BASE = "https://YOUR-SITE-URL";

async function fetchForetrackerInventory(mainSku) {
  const path = mainSku
    ? `/api/integrations/v1/inventory-global?mainSku=${encodeURIComponent(mainSku)}`
    : "/api/integrations/v1/inventory-global";

  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Test connection
const health = await fetch(`${BASE}/api/integrations/v1/health`, {
  headers: { Authorization: `Bearer ${API_KEY}` },
}).then((r) => r.json());

console.log("Connected as:", health.label);

// Pull all inventory
const { count, entries } = await fetchForetrackerInventory();
console.log(`Loaded ${count} inventory rows`);

// Pull order fulfillments (requires fulfillment:read on your key)
const fulfillRes = await fetch(`${BASE}/api/integrations/v1/order-fulfillments`, {
  headers: { Authorization: `Bearer ${API_KEY}` },
});
const fulfill = await fulfillRes.json();
console.log(`Loaded ${fulfill.groupCount} groups, ${fulfill.shipmentCount} shipments`);
```

---

## 5. Recommended integration pattern

1. Call **health** once when your app starts or when you save settings.  
2. Call **inventory-global** and/or **order-fulfillments** on a schedule (e.g. every 15–60 minutes) or when your dashboard refreshes — from your **backend only**.  
3. Map `entries` / `groups` / `shipments` into your database or cache.  
4. Use `fetchedAt` to show “last synced” in your UI.

---

## 6. Error reference

| HTTP status | Likely cause | What to do |
|-------------|--------------|------------|
| **401 Unauthorized** | Missing/wrong key or missing `Bearer ` prefix | Check the Authorization header |
| **403 Forbidden** | Key revoked or insufficient scope | Ask your admin for a new key |
| **5xx** | Temporary server issue | Retry after a short delay |

---

## 7. Key lifecycle

- Keys are **long-lived** until revoked.  
- If a key is compromised or no longer needed, your administrator can **revoke** it in Foretracker (Admin → User Management → Integration API keys).  
- After revocation, request a **new** key — old keys cannot be recovered.

---

## 8. Current permissions

Your key may include one or both scopes:

- `inventory:read` — read global inventory (`/api/integrations/v1/inventory-global`)
- `fulfillment:read` — read order fulfillments (`/api/integrations/v1/order-fulfillments`)

If you receive **401** on an endpoint, your key may not have the required scope. Ask your administrator to add it (no new key required — scopes can be updated on the existing key).

---

## 9. Support

Contact your Foretracker administrator for:

- A new or replacement API key  
- The correct production site URL  
- Additional read endpoints for other modules  

---

*Document version: August 2026 (updated) · Foretracker (MPS) Integration API v1*
