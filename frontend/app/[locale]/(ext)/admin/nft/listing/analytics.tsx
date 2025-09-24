import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftListingAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Listing Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_listings",
          title: "Total Listings",
          metric: "total",
          model: "nftListing",
          icon: "mdi:format-list-bulleted",
        },
        {
          id: "active_listings",
          title: "Active Listings",
          metric: "ACTIVE",
          model: "nftListing",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:check-circle",
        },
        {
          id: "sold_listings",
          title: "Sold Listings",
          metric: "SOLD",
          model: "nftListing",
          aggregation: { field: "status", value: "SOLD" },
          icon: "mdi:currency-usd",
        },
        {
          id: "cancelled_listings",
          title: "Cancelled Listings",
          metric: "CANCELLED",
          model: "nftListing",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
        {
          id: "expired_listings",
          title: "Expired Listings",
          metric: "EXPIRED",
          model: "nftListing",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:clock-alert",
        },
        {
          id: "auction_listings",
          title: "Auction Listings",
          metric: "AUCTION",
          model: "nftListing",
          aggregation: { field: "type", value: "AUCTION" },
          icon: "mdi:gavel",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "listingStatusDistribution",
          title: "Listing Status Distribution",
          type: "pie",
          model: "nftListing",
          metrics: ["ACTIVE", "SOLD", "CANCELLED", "EXPIRED"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "SOLD",
                label: "Sold",
                color: "blue",
                icon: "mdi:currency-usd",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "gray",
                icon: "mdi:cancel",
              },
              {
                value: "EXPIRED",
                label: "Expired",
                color: "red",
                icon: "mdi:clock-alert",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Listing Type Distribution – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "fixed_price_listings",
          title: "Fixed Price",
          metric: "FIXED_PRICE",
          model: "nftListing",
          aggregation: { field: "type", value: "FIXED_PRICE" },
          icon: "mdi:tag",
        },
        {
          id: "auction_type_listings",
          title: "Auctions",
          metric: "AUCTION",
          model: "nftListing",
          aggregation: { field: "type", value: "AUCTION" },
          icon: "mdi:gavel",
        },
        {
          id: "bundle_listings",
          title: "Bundles",
          metric: "BUNDLE",
          model: "nftListing",
          aggregation: { field: "type", value: "BUNDLE" },
          icon: "mdi:package-variant",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "listingTypeDistribution",
          title: "Listing Type Distribution",
          type: "pie",
          model: "nftListing",
          metrics: ["FIXED_PRICE", "AUCTION", "BUNDLE"],
          config: {
            field: "type",
            status: [
              {
                value: "FIXED_PRICE",
                label: "Fixed Price",
                color: "blue",
                icon: "mdi:tag",
              },
              {
                value: "AUCTION",
                label: "Auction",
                color: "purple",
                icon: "mdi:gavel",
              },
              {
                value: "BUNDLE",
                label: "Bundle",
                color: "orange",
                icon: "mdi:package-variant",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Listings Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "listingsOverTime",
        title: "Listings Over Time",
        type: "line",
        model: "nftListing",
        metrics: ["total", "ACTIVE", "SOLD", "EXPIRED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Listings",
          ACTIVE: "Active Listings",
          SOLD: "Sold Listings",
          EXPIRED: "Expired Listings",
        },
      },
    ],
  },
]; 