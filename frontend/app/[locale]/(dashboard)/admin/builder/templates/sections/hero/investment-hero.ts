import type { Section } from "@/types/builder";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const investmentHero: Section = {
  id: "investment-hero",
  type: "regular",
  name: "Investment Hero",
  description: "Professional investment platform hero section",
  category: "hero",
  rows: [
    {
      id: `row-${generateId("row")}`,
      columns: [
        {
          id: `column-${generateId("column")}`,
          width: 60,
          elements: [
            {
              id: `element-${generateId("element")}-1`,
              type: "heading",
              content: "Invest in Your Future",
              settings: {
                fontSize: 48,
                fontWeight: "700",
                lineHeight: 1.2,
                marginBottom: 24,
                color: { light: "#1e293b", dark: "#f8fafc" },
                textAlign: "left",
              },
            },
            {
              id: `element-${generateId("element")}-2`,
              type: "text",
              content: "Build wealth with our AI-powered investment platform. Access global markets, expert insights, and automated portfolio management.",
              settings: {
                fontSize: 18,
                lineHeight: 1.6,
                marginBottom: 32,
                color: { light: "#64748b", dark: "#94a3b8" },
                textAlign: "left",
              },
            },
            {
              id: `element-${generateId("element")}-3`,
              type: "button",
              content: "Start Investing",
              settings: {
                backgroundColor: { light: "#059669", dark: "#059669" },
                hoverBackgroundColor: { light: "#047857", dark: "#047857" },
                color: { light: "#ffffff", dark: "#ffffff" },
                fontSize: 16,
                fontWeight: "600",
                paddingTop: 14,
                paddingRight: 28,
                paddingBottom: 14,
                paddingLeft: 28,
                borderRadius: 8,
                marginRight: 16,
                display: "inline-block",
              },
            },
          ],
          settings: {
            paddingTop: 60,
            paddingRight: 40,
            paddingBottom: 60,
            paddingLeft: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          },
        },
        {
          id: `column-${generateId("column")}`,
          width: 40,
          elements: [
            {
              id: `element-${generateId("element")}-4`,
              type: "text",
              content: "📊",
              settings: {
                fontSize: 120,
                textAlign: "center",
                marginBottom: 24,
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content: "Join 2M+ investors worldwide",
              settings: {
                fontSize: 16,
                fontWeight: "600",
                textAlign: "center",
                color: { light: "#059669", dark: "#34d399" },
              },
            },
          ],
          settings: {
            paddingTop: 60,
            paddingRight: 0,
            paddingBottom: 60,
            paddingLeft: 40,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
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
    paddingBottom: 0,
    paddingLeft: 32,
    backgroundColor: { light: "#f8fafc", dark: "#1e293b" },
  },
}; 