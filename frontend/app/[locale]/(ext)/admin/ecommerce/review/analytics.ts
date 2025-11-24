import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const ecommerceReviewAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Rating Distribution
  // Left: KPI Grid (3 columns x 2 rows) for each star rating
  // Right: Pie Chart for Rating Distribution
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "rating_1_reviews",
          title: "1 Star",
          metric: "1",
          model: "ecommerceReview",
          aggregation: { field: "rating", value: "1" },
          icon: "mdi:star-outline",
        },
        {
          id: "rating_2_reviews",
          title: "2 Stars",
          metric: "2",
          model: "ecommerceReview",
          aggregation: { field: "rating", value: "2" },
          icon: "mdi:star-outline",
        },
        {
          id: "rating_3_reviews",
          title: "3 Stars",
          metric: "3",
          model: "ecommerceReview",
          aggregation: { field: "rating", value: "3" },
          icon: "mdi:star-outline",
        },
        {
          id: "rating_4_reviews",
          title: "4 Stars",
          metric: "4",
          model: "ecommerceReview",
          aggregation: { field: "rating", value: "4" },
          icon: "mdi:star",
        },
        {
          id: "rating_5_reviews",
          title: "5 Stars",
          metric: "5",
          model: "ecommerceReview",
          aggregation: { field: "rating", value: "5" },
          icon: "mdi:star",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "reviewRatingDistribution",
          title: "Rating Distribution",
          type: "pie",
          model: "ecommerceReview",
          metrics: ["1", "2", "3", "4", "5"],
          config: {
            field: "rating",
            status: [
              {
                value: "1",
                label: "1 Star",
                color: "red",
                icon: "mdi:star-outline",
              },
              {
                value: "2",
                label: "2 Stars",
                color: "orange",
                icon: "mdi:star-outline",
              },
              {
                value: "3",
                label: "3 Stars",
                color: "yellow",
                icon: "mdi:star-outline",
              },
              {
                value: "4",
                label: "4 Stars",
                color: "lightgreen",
                icon: "mdi:star",
              },
              {
                value: "5",
                label: "5 Stars",
                color: "green",
                icon: "mdi:star",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Reviews Over Time (Volume)
  // Full-width line chart showing total reviews over time
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "reviewsOverTime",
        title: "Reviews Over Time",
        type: "line",
        model: "ecommerceReview",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Reviews",
        },
      },
    ],
  },
];
