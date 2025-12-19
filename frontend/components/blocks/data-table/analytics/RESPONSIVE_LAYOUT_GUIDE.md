# Analytics Comprehensive Guide

## Table of Contents
1. [Responsive Layout System](#responsive-layout-system)
2. [Backend Model Integration](#backend-model-integration)
3. [Chart Types & Configuration](#chart-types--configuration)
4. [KPI Configuration](#kpi-configuration)
5. [Best Practices](#best-practices)

---

# Responsive Layout System

## Overview

The responsive layout system provides complete control over how analytics components (KPIs and charts) are displayed across different device sizes: **mobile** (< 640px), **tablet** (>= 640px), and **desktop** (>= 1024px).

## Key Features

- ✅ **Device-specific layouts** - Define different grid configurations for mobile, tablet, and desktop
- ✅ **Flexible positioning** - Control column spans and ordering
- ✅ **Visibility control** - Hide/show components on specific devices
- ✅ **Backward compatible** - Legacy `layout` prop still works as fallback
- ✅ **Type-safe** - Full TypeScript support with autocomplete

## Quick Start

### Basic Example

```typescript
{
  type: "kpi",
  responsive: {
    mobile: { cols: 1 },    // Single column on mobile
    tablet: { cols: 2 },    // Two columns on tablet
    desktop: { cols: 2 },   // Two columns on desktop
  },
  items: [/* KPI items */]
}
```

### Complete Configuration

```typescript
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analyticsConfig: AnalyticsConfig = [
  [
    // KPI Section with responsive layout
    {
      type: "kpi",
      // Legacy fallback (optional)
      layout: { cols: 2, rows: 2 },
      // New responsive configuration
      responsive: {
        mobile: {
          cols: 1,        // 1 column on mobile
          rows: 4,        // 4 rows (for 4 KPIs)
          hidden: false,  // Show on mobile (default)
        },
        tablet: {
          cols: 2,        // 2 columns on tablet
          rows: 2,        // 2 rows (2x2 grid)
        },
        desktop: {
          cols: 2,        // 2 columns on desktop
          rows: 2,        // 2 rows
        },
      },
      items: [/* 4 KPI items */]
    },
    // Chart Section
    {
      type: "chart",
      responsive: {
        mobile: {
          cols: 1,        // Full width on mobile
          order: 2,       // Show after KPIs
        },
        tablet: {
          cols: 1,        // Full width on tablet
        },
        desktop: {
          cols: 1,        // Takes 1 column in 2-column section grid
        },
      },
      items: [
        {
          id: "orderStatusDistribution",
          title: "Order Status Distribution",
          type: "pie",
          // ... chart config
        }
      ]
    }
  ]
];
```

## Configuration Options

### ResponsiveLayout Interface

```typescript
interface ResponsiveLayout {
  mobile?: {
    cols?: number;      // Grid columns (default: 1)
    rows?: number;      // Grid rows (auto if not specified)
    span?: number;      // Column span (default: 1)
    order?: number;     // Display order (default: auto)
    hidden?: boolean;   // Hide on mobile (default: false)
  };
  tablet?: {
    cols?: number;      // Grid columns (default: 2)
    rows?: number;      // Grid rows (auto)
    span?: number;      // Column span
    order?: number;     // Display order
    hidden?: boolean;   // Hide on tablet
  };
  desktop?: {
    cols?: number;      // Grid columns (inherits from tablet)
    rows?: number;      // Grid rows (auto)
    span?: number;      // Column span
    order?: number;     // Display order
    hidden?: boolean;   // Hide on desktop
  };
}
```

### Tailwind Breakpoints

The system uses standard Tailwind CSS breakpoints:

- **Mobile**: `< 640px` (default, no prefix)
- **Tablet**: `>= 640px` (`sm:` prefix)
- **Desktop**: `>= 1024px` (`lg:` prefix)

## Common Patterns

### Pattern 1: Vertical Stack on Mobile, Grid on Tablet/Desktop

Perfect for KPI cards:

```typescript
{
  type: "kpi",
  responsive: {
    mobile: { cols: 1, rows: 4 },  // Vertical list
    tablet: { cols: 2, rows: 2 },  // 2x2 grid
    desktop: { cols: 4, rows: 1 }, // Horizontal row
  },
  items: [/* 4 KPIs */]
}
```

### Pattern 2: Full Width on All Devices

Perfect for line charts:

```typescript
{
  type: "chart",
  responsive: {
    mobile: { cols: 1 },
    tablet: { cols: 1 },
    desktop: { cols: 1 },
  },
  items: [/* chart config */]
}
```

### Pattern 3: Hide on Mobile, Show on Desktop

For non-essential charts:

```typescript
{
  type: "chart",
  responsive: {
    mobile: { hidden: true },      // Hidden on mobile
    tablet: { hidden: true },      // Hidden on tablet
    desktop: { cols: 1 },          // Visible on desktop
  },
  items: [/* chart config */]
}
```

### Pattern 4: Reorder Components on Mobile

Show important content first on mobile:

```typescript
[
  {
    type: "kpi",
    responsive: {
      mobile: { order: 1 },  // First on mobile
      desktop: { order: 2 }, // Second on desktop
    },
    items: [/* KPIs */]
  },
  {
    type: "chart",
    responsive: {
      mobile: { order: 2 },  // Second on mobile
      desktop: { order: 1 }, // First on desktop
    },
    items: [/* chart */]
  }
]
```

### Pattern 5: Different Grids per Device

```typescript
{
  type: "kpi",
  responsive: {
    mobile: { cols: 1 },   // 1 column
    tablet: { cols: 3 },   // 3 columns
    desktop: { cols: 4 },  // 4 columns
  },
  items: [/* 4 KPIs */]
}
```

## Real-World Example: E-Commerce Order Analytics

```typescript
export function useAnalytics() {
  return [
    // Row 1: Order Status KPIs + Distribution Chart
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, rows: 4 },
          tablet: { cols: 2, rows: 2 },
          desktop: { cols: 2, rows: 2 },
        },
        items: [
          { id: "total_orders", title: "Total Orders", metric: "total", icon: "mdi:format-list-bulleted" },
          { id: "open_orders", title: "Open", metric: "OPEN", icon: "mdi:clock-outline" },
          { id: "closed_orders", title: "Closed", metric: "CLOSED", icon: "mdi:check-circle" },
          { id: "cancelled_orders", title: "Cancelled", metric: "CANCELLED", icon: "mdi:close-circle" },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, order: 2 },
          tablet: { cols: 1 },
          desktop: { cols: 1 },
        },
        items: [
          { id: "orderStatusDistribution", title: "Status Distribution", type: "pie" },
        ],
      },
    ],
    // Row 2: Buy/Sell KPIs + Side Distribution
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, rows: 2 },
          tablet: { cols: 2, rows: 1 },
          desktop: { cols: 2, rows: 1 },
        },
        items: [
          { id: "buy_orders", title: "Buy Orders", metric: "BUY", icon: "mdi:trending-up" },
          { id: "sell_orders", title: "Sell Orders", metric: "SELL", icon: "mdi:trending-down" },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1 },
          tablet: { cols: 1 },
          desktop: { cols: 1 },
        },
        items: [
          { id: "orderSideDistribution", title: "Buy/Sell Distribution", type: "pie" },
        ],
      },
    ],
    // Row 3: Orders Over Time (Full Width)
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1 },
        tablet: { cols: 1 },
        desktop: { cols: 1 },
      },
      items: [
        { id: "ordersOverTime", title: "Orders Over Time", type: "line" },
      ],
    },
  ];
}
```

## Migration from Legacy Layout

### Before (Legacy)

```typescript
{
  type: "kpi",
  layout: { cols: 2, rows: 2 },  // Same on all devices
  items: [/* KPIs */]
}
```

### After (Responsive)

```typescript
{
  type: "kpi",
  // Keep legacy for fallback
  layout: { cols: 2, rows: 2 },
  // Add responsive configuration
  responsive: {
    mobile: { cols: 1, rows: 4 },   // Better for mobile
    tablet: { cols: 2, rows: 2 },   // Same as legacy
    desktop: { cols: 2, rows: 2 },  // Same as legacy
  },
  items: [/* KPIs */]
}
```

## Best Practices

### 1. Mobile-First Design
Always start with mobile layout:
```typescript
responsive: {
  mobile: { cols: 1 },    // Start here
  tablet: { cols: 2 },    // Then scale up
  desktop: { cols: 3 },   // Finally desktop
}
```

### 2. Use Sensible Defaults
If tablet/desktop aren't specified, they inherit:
```typescript
responsive: {
  mobile: { cols: 1 },
  // tablet defaults to cols: 2
  // desktop inherits from tablet
}
```

### 3. Test on All Devices
- Mobile: 375px (iPhone SE), 428px (iPhone Pro Max)
- Tablet: 768px (iPad), 1024px (iPad Pro)
- Desktop: 1280px, 1920px

### 4. Consider Content Hierarchy
Use `order` to prioritize important content on mobile:
```typescript
responsive: {
  mobile: { order: 1 },  // Show critical KPIs first
}
```

### 5. Hide Non-Essential Content on Mobile
```typescript
responsive: {
  mobile: { hidden: true },  // Skip secondary charts on mobile
  desktop: { cols: 1 },
}
```

## Troubleshooting

### Problem: Layout Not Changing on Resize
**Solution**: Clear browser cache and ensure Tailwind classes are being generated. Check that `safelist` includes grid classes in `tailwind.config.js`.

### Problem: Items Overlapping
**Solution**: Verify `cols` and `span` values. Ensure `span` doesn't exceed `cols`.

### Problem: Unexpected Order on Mobile
**Solution**: Check `order` values. Lower numbers appear first.

### Problem: Chart Not Visible on Mobile
**Solution**: Check if `hidden: true` is set for mobile. Remove or set to `false`.

## TypeScript Support

The system is fully typed. Your IDE will provide autocomplete for all options:

```typescript
import type { AnalyticsConfig, ResponsiveLayout } from "@/components/blocks/data-table/types/analytics";

const layout: ResponsiveLayout = {
  mobile: {
    cols: 1,        // ✅ Autocomplete
    rows: 2,        // ✅ Autocomplete
    // span: "invalid" // ❌ Type error
  }
};
```

---

# Backend Model Integration

## Understanding Your Data Model

Before creating analytics, you **MUST** understand the backend model structure. Analytics are only as good as the data they're based on.

### Step 1: Locate Your Model

Backend models are located in `backend/models/`. Common model locations:

```
backend/models/
├── exchange/
│   └── exchangeOrder.ts         # Exchange orders
├── ext/
│   ├── ecosystem/
│   │   └── ecosystemPrivateLedger.ts  # Ecosystem ledger
│   ├── ecommerce/
│   │   └── ecommerceOrder.ts    # Ecommerce orders
│   ├── nft/
│   │   └── nftSale.ts           # NFT sales
│   └── p2p/
│       └── p2pTrade.ts          # P2P trades
├── finance/
│   └── transaction.ts           # Financial transactions
└── user.ts                      # User accounts
```

### Step 2: Read the Model Definition

**Example: Exchange Order Model** (`backend/models/exchange/exchangeOrder.ts`)

```typescript
export interface exchangeOrderAttributes {
  id: string;
  referenceId?: string;
  userId: string;
  status: "OPEN" | "CLOSED" | "CANCELED" | "EXPIRED" | "REJECTED";  // ← ENUM field
  symbol: string;
  type: "MARKET" | "LIMIT";                                         // ← ENUM field
  timeInForce: "GTC" | "IOC" | "FOK" | "PO";                       // ← ENUM field
  side: "BUY" | "SELL";                                            // ← ENUM field
  price: number;                                                   // ← Numeric field
  average?: number;
  amount: number;                                                  // ← Numeric field
  filled: number;
  remaining: number;
  cost: number;
  trades?: string;
  fee: number;
  feeCurrency: string;
  createdAt?: Date;                                                // ← Timestamp
  deletedAt?: Date;
  updatedAt?: Date;
}
```

### Step 3: Identify Analyzable Fields

**Field Types for Analytics:**

| Field Type | Use in Analytics | Example Fields | Analytics Types |
|------------|------------------|----------------|-----------------|
| **ENUM** | Status distributions, categorization | `status`, `type`, `side` | Pie charts, KPIs with aggregation |
| **Number** | Counts, sums, averages | `price`, `amount`, `cost` | KPIs, line charts, bar charts |
| **Date** | Time-series analysis | `createdAt`, `updatedAt` | Line charts, trend analysis |
| **Boolean** | Binary analysis | `verified`, `active` | Pie charts, KPIs |
| **String** | Grouping (if limited values) | `currency`, `symbol` | Categorization |

### Step 4: Validate Model Name

The `model` field in analytics config must match the model name:

```typescript
// ✅ CORRECT - matches modelName in the model file
{
  model: "exchangeOrder",  // From: modelName: "exchangeOrder"
  // ...
}

// ❌ WRONG - doesn't match
{
  model: "exchange_order",  // Table name, not model name!
  // ...
}

// ❌ WRONG - typo
{
  model: "exchangeOrders",  // Plural!
  // ...
}
```

**How to find the correct model name:**

1. Open the model file (e.g., `backend/models/exchange/exchangeOrder.ts`)
2. Look for `modelName:` in the `init()` method:
   ```typescript
   {
     sequelize,
     modelName: "exchangeOrder",  // ← Use this exact name
     tableName: "exchange_order",
   }
   ```

### Step 5: Validate Field Names

Field names must match the model attribute names **exactly** (case-sensitive).

```typescript
// ✅ CORRECT
{
  metric: "status",     // Matches: status: "OPEN" | "CLOSED" | ...
  aggregation: {
    field: "side",      // Matches: side: "BUY" | "SELL"
    value: "BUY"
  }
}

// ❌ WRONG - case mismatch
{
  metric: "Status",     // Should be lowercase "status"
  aggregation: {
    field: "Side",      // Should be lowercase "side"
    value: "buy"        // Should be uppercase "BUY" (matches ENUM)
  }
}
```

### Step 6: Validate ENUM Values

For ENUM fields, values must match the model definition exactly.

**Example from exchangeOrder model:**

```typescript
// Model definition
status: DataTypes.ENUM("OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED")
```

```typescript
// ✅ CORRECT - exact match
{
  aggregation: { field: "status", value: "OPEN" }       // ✅
  aggregation: { field: "status", value: "CLOSED" }     // ✅
  aggregation: { field: "status", value: "CANCELED" }   // ✅ (American spelling)
}

// ❌ WRONG
{
  aggregation: { field: "status", value: "open" }       // ❌ Lowercase
  aggregation: { field: "status", value: "CANCELLED" }  // ❌ British spelling
  aggregation: { field: "status", value: "COMPLETE" }   // ❌ Not in ENUM
}
```

## Complete Model Analysis Example

**Scenario:** Create analytics for exchange orders

### Step 1: Analyze the Model

```typescript
// backend/models/exchange/exchangeOrder.ts
export interface exchangeOrderAttributes {
  // Identifiers
  id: string;
  userId: string;

  // ENUM fields (perfect for pie charts)
  status: "OPEN" | "CLOSED" | "CANCELED" | "EXPIRED" | "REJECTED";
  type: "MARKET" | "LIMIT";
  side: "BUY" | "SELL";

  // Numeric fields (perfect for KPIs and trends)
  price: number;
  amount: number;
  filled: number;
  cost: number;
  fee: number;

  // Timestamps (perfect for time-series)
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Step 2: Design Analytics

Based on the model, here's what we can analyze:

**KPIs:**
- Total orders (`metric: "total"`)
- Orders by status (`aggregation: { field: "status", value: "OPEN" }`)
- Orders by side (`aggregation: { field: "side", value: "BUY" }`)
- Orders by type (`aggregation: { field: "type", value: "MARKET" }`)

**Pie Charts:**
- Status distribution (OPEN, CLOSED, CANCELED, EXPIRED, REJECTED)
- Side distribution (BUY, SELL)
- Type distribution (MARKET, LIMIT)

**Line Charts:**
- Orders over time (using `createdAt`)
- Volume over time (sum of `amount`)
- Cost over time (sum of `cost`)

### Step 3: Create Analytics Config

```typescript
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    [
      // KPI Section - Status-based KPIs
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, rows: 5 },
          tablet: { cols: 2, rows: 3 },
          desktop: { cols: 3, rows: 2 },
        },
        items: [
          {
            id: "total_orders",
            title: t("total_orders"),
            metric: "total",           // ✅ Special metric for count
            model: "exchangeOrder",    // ✅ Matches modelName
            icon: "mdi:format-list-bulleted",
          },
          {
            id: "open_orders",
            title: tCommon("open"),
            metric: "OPEN",            // ✅ Matches ENUM value
            model: "exchangeOrder",
            aggregation: {
              field: "status",         // ✅ Matches field name
              value: "OPEN"            // ✅ Matches ENUM value
            },
            icon: "mdi:clock-outline",
          },
          {
            id: "closed_orders",
            title: tCommon("closed"),
            metric: "CLOSED",
            model: "exchangeOrder",
            aggregation: {
              field: "status",
              value: "CLOSED"          // ✅ Exact spelling from ENUM
            },
            icon: "mdi:check-circle",
          },
          {
            id: "canceled_orders",
            title: tCommon("canceled"),
            metric: "CANCELED",
            model: "exchangeOrder",
            aggregation: {
              field: "status",
              value: "CANCELED"        // ✅ American spelling (matches model)
            },
            icon: "mdi:close-circle",
          },
          {
            id: "expired_orders",
            title: tCommon("expired"),
            metric: "EXPIRED",
            model: "exchangeOrder",
            aggregation: {
              field: "status",
              value: "EXPIRED"
            },
            icon: "mdi:timer-off",
          },
        ],
      },

      // Pie Chart - Status Distribution
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1 },
          tablet: { cols: 1 },
          desktop: { cols: 1 },
        },
        items: [
          {
            id: "orderStatusDistribution",
            title: t("order_status_distribution"),
            type: "pie",
            model: "exchangeOrder",      // ✅ Matches modelName
            metrics: ["OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED"],  // ✅ All ENUM values
            config: {
              field: "status",           // ✅ Matches field name
              status: [
                {
                  value: "OPEN",         // ✅ Matches ENUM
                  label: tCommon("open"),
                  color: "blue",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "CLOSED",       // ✅ Matches ENUM
                  label: tCommon("closed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "CANCELED",     // ✅ Matches ENUM exactly
                  label: tCommon("canceled"),
                  color: "amber",
                  icon: "mdi:close-circle",
                },
                {
                  value: "EXPIRED",
                  label: tCommon("expired"),
                  color: "red",
                  icon: "mdi:timer-off",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "purple",
                  icon: "mdi:thumb-down",
                },
              ],
            },
          },
        ],
      },
    ],

    // Side Distribution
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, rows: 2 },
          tablet: { cols: 2, rows: 1 },
          desktop: { cols: 2, rows: 1 },
        },
        items: [
          {
            id: "buy_orders",
            title: tCommon("buy"),
            metric: "BUY",
            model: "exchangeOrder",
            aggregation: {
              field: "side",           // ✅ ENUM field
              value: "BUY"             // ✅ Matches ENUM
            },
            icon: "mdi:trending-up",
          },
          {
            id: "sell_orders",
            title: tCommon("sell"),
            metric: "SELL",
            model: "exchangeOrder",
            aggregation: {
              field: "side",
              value: "SELL"            // ✅ Matches ENUM
            },
            icon: "mdi:trending-down",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1 },
          tablet: { cols: 1 },
          desktop: { cols: 1 },
        },
        items: [
          {
            id: "orderSideDistribution",
            title: t("order_side_distribution"),
            type: "pie",
            model: "exchangeOrder",
            metrics: ["BUY", "SELL"],    // ✅ All side ENUM values
            config: {
              field: "side",             // ✅ Matches field name
              status: [
                {
                  value: "BUY",          // ✅ Matches ENUM
                  label: tCommon("buy"),
                  color: "green",
                  icon: "mdi:trending-up",
                },
                {
                  value: "SELL",         // ✅ Matches ENUM
                  label: tCommon("sell"),
                  color: "red",
                  icon: "mdi:trending-down",
                },
              ],
            },
          },
        ],
      },
    ],

    // Time Series Chart
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1 },
        tablet: { cols: 1 },
        desktop: { cols: 1 },
      },
      items: [
        {
          id: "ordersOverTime",
          title: t("orders_over_time"),
          type: "line",
          model: "exchangeOrder",        // ✅ Matches modelName
          metrics: ["total", "OPEN", "CLOSED", "CANCELED"],  // ✅ Metrics to track
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            OPEN: tCommon("open"),
            CLOSED: tCommon("closed"),
            CANCELED: tCommon("canceled"),
          },
        },
      ],
    },
  ];
}
```

## Common Validation Errors

### Error 1: Model Not Found

```
Error: Model "exchangeOrders" not found
```

**Cause:** Incorrect model name (using plural or wrong casing)

**Fix:** Check the model file for exact `modelName`:
```typescript
// backend/models/exchange/exchangeOrder.ts
modelName: "exchangeOrder",  // ← Use this exact name
```

### Error 2: Field Not Found

```
Error: Field "Status" does not exist on model "exchangeOrder"
```

**Cause:** Incorrect field name casing

**Fix:** Match the model attribute exactly:
```typescript
// Model has: status (lowercase)
metric: "status"  // ✅ Correct
metric: "Status"  // ❌ Wrong casing
```

### Error 3: Invalid ENUM Value

```
Error: Invalid value "open" for field "status"
```

**Cause:** ENUM value doesn't match model definition

**Fix:** Check model ENUM values:
```typescript
// Model defines: "OPEN", "CLOSED", "CANCELED" (uppercase, American spelling)
value: "OPEN"      // ✅ Correct
value: "open"      // ❌ Wrong casing
value: "CANCELLED" // ❌ Wrong spelling
```

### Error 4: Wrong Aggregation Field

```
Error: Cannot aggregate on field "price" with value "OPEN"
```

**Cause:** Trying to use a numeric field for status aggregation

**Fix:** Only use ENUM/boolean fields for aggregation:
```typescript
// ✅ Correct - ENUM field
aggregation: { field: "status", value: "OPEN" }

// ❌ Wrong - numeric field
aggregation: { field: "price", value: "100" }
```

## Validation Checklist

Before deploying analytics, verify:

- [ ] Model name matches `modelName` in model file (case-sensitive)
- [ ] All field names match model attributes exactly
- [ ] ENUM values match model definition exactly (case and spelling)
- [ ] Numeric fields are used for KPIs, not for status aggregation
- [ ] ENUM/boolean fields are used for pie charts
- [ ] Date fields are available for time-series charts
- [ ] All required model associations are set up
- [ ] Metrics in charts correspond to actual model fields

---

# Chart Types & Configuration

## Overview of Chart Types

The analytics system supports 5 chart types:

| Type | Use Case | Best For | Data Structure |
|------|----------|----------|----------------|
| `pie` | Distribution/proportions | Status distributions, categorical data | Array of categories with values |
| `line` | Trends over time | Time-series data, performance tracking | Date + multiple metrics |
| `bar` | Comparisons | Comparing values across categories | Categories + values |
| `stackedBar` | Multi-dimensional comparison | Comparing multiple metrics per category | Categories + stacked metrics |
| `stackedArea` | Cumulative trends | Showing composition over time | Date + cumulative metrics |

## 1. Pie Chart Configuration

**Use for:** Status distributions, categorical proportions

### Complete Interface

```typescript
{
  id: string;                    // Unique identifier
  title: string;                 // Display title
  type: "pie";                   // Chart type
  model: string;                 // Backend model name
  metrics: string[];             // ENUM values to display
  config: {
    field: string;               // Model field to aggregate on
    status: StatusConfig[];      // Configuration for each segment
  }
}

interface StatusConfig {
  value: string;                 // ENUM value (must match model)
  label: string;                 // Display label
  color: string;                 // Segment color
  icon?: string;                 // Optional icon (Iconify format)
}
```

### Color Options

```typescript
// Supported colors (uses theme system)
color: "blue" | "green" | "red" | "amber" | "purple" | "emerald" | "rose" | "gold" | "silver"
```

### Complete Example

```typescript
{
  id: "orderStatusDistribution",
  title: "Order Status Distribution",
  type: "pie",
  model: "exchangeOrder",
  metrics: ["OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED"],
  config: {
    field: "status",
    status: [
      {
        value: "OPEN",
        label: "Open Orders",
        color: "blue",
        icon: "mdi:clock-outline",
      },
      {
        value: "CLOSED",
        label: "Completed",
        color: "green",
        icon: "mdi:check-circle",
      },
      {
        value: "CANCELED",
        label: "Cancelled",
        color: "amber",
        icon: "mdi:close-circle",
      },
      {
        value: "EXPIRED",
        label: "Expired",
        color: "red",
        icon: "mdi:timer-off",
      },
      {
        value: "REJECTED",
        label: "Rejected",
        color: "purple",
        icon: "mdi:thumb-down",
      },
    ],
  },
}
```

## 2. Line Chart Configuration

**Use for:** Time-series data, trends

### Complete Interface

```typescript
{
  id: string;                           // Unique identifier
  title: string;                        // Display title
  type: "line";                         // Chart type
  model: string;                        // Backend model name
  metrics: string[];                    // Fields/aggregations to track
  timeframes?: string[];                // Available time ranges
  labels?: Record<string, string>;      // Metric labels
}
```

### Timeframe Options

```typescript
timeframes: [
  "24h",   // Last 24 hours
  "7d",    // Last 7 days
  "30d",   // Last 30 days
  "3m",    // Last 3 months
  "6m",    // Last 6 months
  "y",     // Last year
]
```

### Complete Example

```typescript
{
  id: "ordersOverTime",
  title: "Orders Over Time",
  type: "line",
  model: "exchangeOrder",
  metrics: ["total", "OPEN", "CLOSED", "CANCELED"],
  timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
  labels: {
    total: "Total Orders",
    OPEN: "Open",
    CLOSED: "Closed",
    CANCELED: "Cancelled",
  },
}
```

### Multi-Metric Line Chart

```typescript
{
  id: "revenueMetrics",
  title: "Revenue Metrics",
  type: "line",
  model: "transaction",
  metrics: ["revenue", "profit", "cost"],
  timeframes: ["30d", "3m", "6m", "y"],
  labels: {
    revenue: "Total Revenue",
    profit: "Net Profit",
    cost: "Operating Cost",
  },
}
```

## 3. Bar Chart Configuration

**Use for:** Comparing values across categories

### Complete Interface

```typescript
{
  id: string;
  title: string;
  type: "bar";
  model: string;
  metrics: string[];                    // Metrics to display as bars
  timeframes?: string[];
  labels?: Record<string, string>;
}
```

### Example

```typescript
{
  id: "ordersByType",
  title: "Orders by Type",
  type: "bar",
  model: "exchangeOrder",
  metrics: ["MARKET", "LIMIT"],
  timeframes: ["30d", "3m", "6m"],
  labels: {
    MARKET: "Market Orders",
    LIMIT: "Limit Orders",
  },
}
```

## 4. Stacked Bar Chart Configuration

**Use for:** Multi-dimensional comparisons

### Complete Interface

```typescript
{
  id: string;
  title: string;
  type: "stackedBar";
  model: string;
  metrics: string[];                    // Metrics to stack
  timeframes?: string[];
  labels?: Record<string, string>;
}
```

### Example

```typescript
{
  id: "orderComposition",
  title: "Order Composition by Status",
  type: "stackedBar",
  model: "exchangeOrder",
  metrics: ["OPEN", "CLOSED", "CANCELED"],
  timeframes: ["7d", "30d", "3m"],
  labels: {
    OPEN: "Open",
    CLOSED: "Closed",
    CANCELED: "Cancelled",
  },
}
```

## 5. Stacked Area Chart Configuration

**Use for:** Cumulative trends over time

### Complete Interface

```typescript
{
  id: string;
  title: string;
  type: "stackedArea";
  model: string;
  metrics: string[];                    // Metrics to stack
  timeframes?: string[];
  labels?: Record<string, string>;
}
```

### Example

```typescript
{
  id: "cumulativeOrders",
  title: "Cumulative Order Status",
  type: "stackedArea",
  model: "exchangeOrder",
  metrics: ["OPEN", "CLOSED", "CANCELED"],
  timeframes: ["30d", "3m", "6m", "y"],
  labels: {
    OPEN: "Open Orders",
    CLOSED: "Closed Orders",
    CANCELED: "Cancelled Orders",
  },
}
```

## Chart Configuration Best Practices

### 1. Choose the Right Chart Type

```typescript
// ✅ Good - Pie for status distribution
{ type: "pie", metrics: ["OPEN", "CLOSED", "CANCELED"] }

// ❌ Bad - Line chart for status (not time-series)
{ type: "line", metrics: ["OPEN", "CLOSED", "CANCELED"] }

// ✅ Good - Line for trends
{ type: "line", metrics: ["total", "OPEN", "CLOSED"] }

// ✅ Good - Stacked bar for composition
{ type: "stackedBar", metrics: ["BUY", "SELL"] }
```

### 2. Limit Metrics

```typescript
// ✅ Good - 2-5 metrics for readability
metrics: ["total", "OPEN", "CLOSED"]

// ❌ Bad - Too many metrics (cluttered)
metrics: ["total", "OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED", "PENDING"]
```

### 3. Use Appropriate Timeframes

```typescript
// ✅ Good - Relevant timeframes for your data
timeframes: ["24h", "7d", "30d", "3m"]

// ❌ Bad - Unnecessary granularity
timeframes: ["1h", "2h", "3h", "6h", "12h", "24h", "2d", "3d"]
```

### 4. Provide Clear Labels

```typescript
// ✅ Good - Human-readable labels
labels: {
  total: "Total Orders",
  OPEN: "Open Orders",
  CLOSED: "Completed Orders",
}

// ❌ Bad - Technical labels
labels: {
  total: "count",
  OPEN: "status_open",
  CLOSED: "status_closed",
}
```

---

# KPI Configuration

## KPI Types

### 1. Total Count KPI

**Counts all records in the model**

```typescript
{
  id: "total_orders",
  title: "Total Orders",
  metric: "total",          // Special metric for count(*)
  model: "exchangeOrder",
  icon: "mdi:format-list-bulleted",
}
```

### 2. Aggregated KPI

**Counts records matching a specific condition**

```typescript
{
  id: "open_orders",
  title: "Open Orders",
  metric: "OPEN",           // Name for this metric
  model: "exchangeOrder",
  aggregation: {
    field: "status",        // Field to filter on
    value: "OPEN"           // Value to match
  },
  icon: "mdi:clock-outline",
}
```

### 3. Multi-Field Aggregation

**Counts records matching multiple conditions**

```typescript
{
  id: "high_value_buy_orders",
  title: "High-Value Buy Orders",
  metric: "high_value_buy",
  model: "exchangeOrder",
  aggregation: {
    field: "side",
    value: "BUY"
  },
  // Backend would need to add additional filter for cost > threshold
  icon: "mdi:currency-usd",
}
```

## KPI Variants (Visual Styles)

```typescript
variant: "success" | "info" | "warning" | "danger"

// Color themes:
// success: Green (positive metrics)
// info: Blue (neutral metrics)
// warning: Amber (attention metrics)
// danger: Red (critical metrics)
```

## KPI Display Features

### Trend Line

All KPIs automatically display a mini trend chart showing the metric's change over time.

### Percentage Change

KPIs show percentage change comparing:
- First half of the period vs second half
- Displayed as ↑/↓ with percentage

### Loading State

KPIs show skeleton loaders during data fetch.

## Complete KPI Example

```typescript
{
  type: "kpi",
  responsive: {
    mobile: { cols: 1, rows: 6 },
    tablet: { cols: 2, rows: 3 },
    desktop: { cols: 3, rows: 2 },
  },
  items: [
    // Total count
    {
      id: "total_orders",
      title: "Total Orders",
      metric: "total",
      model: "exchangeOrder",
      icon: "mdi:format-list-bulleted",
    },

    // Status aggregation
    {
      id: "open_orders",
      title: "Open",
      metric: "OPEN",
      model: "exchangeOrder",
      aggregation: { field: "status", value: "OPEN" },
      icon: "mdi:clock-outline",
    },
    {
      id: "closed_orders",
      title: "Closed",
      metric: "CLOSED",
      model: "exchangeOrder",
      aggregation: { field: "status", value: "CLOSED" },
      icon: "mdi:check-circle",
    },
    {
      id: "canceled_orders",
      title: "Cancelled",
      metric: "CANCELED",
      model: "exchangeOrder",
      aggregation: { field: "status", value: "CANCELED" },
      icon: "mdi:close-circle",
    },

    // Side aggregation
    {
      id: "buy_orders",
      title: "Buy Orders",
      metric: "BUY",
      model: "exchangeOrder",
      aggregation: { field: "side", value: "BUY" },
      icon: "mdi:trending-up",
    },
    {
      id: "sell_orders",
      title: "Sell Orders",
      metric: "SELL",
      model: "exchangeOrder",
      aggregation: { field: "side", value: "SELL" },
      icon: "mdi:trending-down",
    },
  ],
}
```

---

# Best Practices

## 1. Model-Driven Development

**Always start with the model:**

1. Read the model file
2. Identify analyzable fields
3. Design analytics based on available data
4. Validate field names and ENUM values

## 2. Validation Before Deployment

```typescript
// Validation checklist:
// [ ] Model name correct
// [ ] Field names correct
// [ ] ENUM values exact match
// [ ] Appropriate chart types
// [ ] Reasonable metric counts
// [ ] Clear labels
// [ ] Responsive layouts defined
```

## 3. Performance Considerations

```typescript
// ✅ Good - Reasonable timeframes
timeframes: ["7d", "30d", "3m"]

// ❌ Bad - Too much data
timeframes: ["1h", "2h", "3h", ... , "y"]

// ✅ Good - Limited metrics
metrics: ["total", "OPEN", "CLOSED"]

// ❌ Bad - Too many metrics
metrics: [/* 15+ metrics */]
```

## 4. User Experience

```typescript
// ✅ Good - Mobile-friendly layout
responsive: {
  mobile: { cols: 1, rows: 4 },   // Vertical stack
  tablet: { cols: 2, rows: 2 },   // Comfortable grid
  desktop: { cols: 4, rows: 1 },  // Horizontal
}

// ❌ Bad - Cramped on mobile
responsive: {
  mobile: { cols: 4, rows: 1 },   // Too many columns
}
```

## 5. Consistent Naming

```typescript
// ✅ Good - Consistent naming
id: "total_orders"
title: "Total Orders"
metric: "total"

// ❌ Bad - Inconsistent
id: "totOrds"
title: "All Ords"
metric: "cnt"
```

## 6. Icon Selection

Use [Iconify](https://icon-sets.iconify.design/) icons in format: `{collection}:{icon-name}`

```typescript
// Material Design Icons (mdi)
icon: "mdi:clock-outline"
icon: "mdi:check-circle"
icon: "mdi:trending-up"

// Lucide Icons
icon: "lucide:bar-chart"
icon: "lucide:pie-chart"

// Heroicons
icon: "heroicons:chart-bar"
```

---

## Support

For issues or questions:
1. Check this guide
2. Review examples in `frontend/app/[locale]/(dashboard)/admin/finance/order/ecosystem/analytics.ts`
3. Inspect component implementation in `frontend/components/blocks/data-table/analytics/`
4. Verify backend model in `backend/models/`
