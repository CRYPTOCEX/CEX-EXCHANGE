import type { Section } from "@/types/builder";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const tradingFeatures: Section = {
  id: "trading-features",
  type: "regular",
  name: "Trading Features",
  description: "Showcase of trading platform features",
  category: "features",
  rows: [
    {
      id: `row-${generateId("row")}`,
      columns: [
        {
          id: `column-${generateId("column")}`,
          width: 100,
          elements: [
            {
              id: `element-${generateId("element")}-1`,
              type: "heading",
              content: "Advanced Trading Features",
              settings: {
                fontSize: 48,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 24,
                color: { light: "#1e293b", dark: "#f8fafc" },
              },
            },
            {
              id: `element-${generateId("element")}-2`,
              type: "text",
              content: "Everything you need to trade like a pro",
              settings: {
                fontSize: 20,
                textAlign: "center",
                marginBottom: 64,
                color: { light: "#64748b", dark: "#94a3b8" },
              },
            },
          ],
          settings: {
            paddingTop: 80,
            paddingBottom: 40,
            textAlign: "center",
          },
        },
      ],
      settings: {
        maxWidth: "1200px",
        marginLeft: "auto",
        marginRight: "auto",
      },
    },
  ],
  settings: {
    paddingTop: 0,
    paddingRight: 32,
    paddingBottom: 80,
    paddingLeft: 32,
    backgroundColor: { light: "#f8fafc", dark: "#1e293b" },
  },
}; 