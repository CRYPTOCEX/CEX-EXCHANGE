import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

// analytics config snippet
export const analytics: AnalyticsConfig = [
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_api_keys",
          title: "Total API Keys",
          metric: "total",
          model: "apiKey",
          icon: "Key",
        },
        {
          id: "plugin_api_keys",
          title: "Plugin Keys",
          metric: "plugin",
          model: "apiKey",
          aggregation: { field: "type", value: "plugin" },
          icon: "Layers",
        },
        {
          id: "user_api_keys",
          title: "User Keys",
          metric: "user",
          model: "apiKey",
          aggregation: { field: "type", value: "user" },
          icon: "User",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "apiKeyTypeDistribution",
          title: "API Key Type Distribution",
          type: "pie",
          model: "apiKey",
          metrics: ["plugin", "user"],
          config: {
            // tell the backend which column to check
            field: "type",
            // list the possible values (and extra presentation info)
            status: [
              {
                value: "plugin",
                label: "Plugin Keys",
                color: "info",
                icon: "mdi:layers",
              },
              {
                value: "user",
                label: "User Keys",
                color: "primary",
                icon: "mdi:account",
              },
            ],
          },
        },
      ],
    },
  ],
  {
    type: "chart",
    items: [
      {
        id: "apiKeyCreationOverTime",
        title: "API Keys Over Time",
        type: "line",
        model: "apiKey",
        metrics: ["total", "plugin", "user"],
        timeframes: ["24h", "7d", "30d", "3m", "6m"],
        labels: {
          total: "Total API Keys",
          plugin: "Plugin Keys",
          user: "User Keys",
        },
      },
    ],
  },
];
