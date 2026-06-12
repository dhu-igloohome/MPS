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
console.log(`Loaded ${count} rows`);
```

---

## 5. Recommended integration pattern

1. Call **health** once when your app starts or when you save settings.  
2. Call **inventory-global** on a schedule (e.g. every 15–60 minutes) or when your dashboard refreshes — from your **backend only**.  
3. Map `entries` into your inventory database or cache.  
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

Your key is scoped to:

- `inventory:read` — read global inventory only

Other data (orders, contracts, forecasts, etc.) is not available through this API unless your administrator adds more scopes in the future.

---

## 9. Support

Contact your Foretracker administrator for:

- A new or replacement API key  
- The correct production site URL  
- Additional read endpoints for other modules  

---

*Document version: June 2026 · Foretracker (MPS) Integration API v1*
