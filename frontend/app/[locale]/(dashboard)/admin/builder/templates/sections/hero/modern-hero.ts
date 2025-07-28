import type { Section } from "@/types/builder";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const modernHero: Section = {
  id: "modern-hero",
  type: "regular",
  name: "Modern Hero",
  description: "Clean, modern hero with minimal design",
  category: "hero",
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
              content: "Experience Modern Trading",
              settings: {
                fontSize: 64,
                fontWeight: "300",
                lineHeight: 1.1,
                marginBottom: 32,
                color: { light: "#1e293b", dark: "#f8fafc" },
                textAlign: "center",
                letterSpacing: "-0.02em",
              },
            },
            {
              id: `element-${generateId("element")}-2`,
              type: "text",
              content: "Minimalist design meets powerful functionality",
              settings: {
                fontSize: 20,
                lineHeight: 1.5,
                marginBottom: 48,
                color: { light: "#64748b", dark: "#94a3b8" },
                textAlign: "center",
                fontWeight: "300",
              },
            },
            {
              id: `element-${generateId("element")}-3`,
              type: "button",
              content: "Get Started",
              settings: {
                backgroundColor: { light: "#000000", dark: "#ffffff" },
                hoverBackgroundColor: { light: "#374151", dark: "#e5e7eb" },
                color: { light: "#ffffff", dark: "#000000" },
                fontSize: 16,
                fontWeight: "500",
                paddingTop: 16,
                paddingRight: 32,
                paddingBottom: 16,
                paddingLeft: 32,
                borderRadius: 2,
                display: "inline-block",
              },
            },
          ],
          settings: {
            paddingTop: 120,
            paddingRight: 32,
            paddingBottom: 120,
            paddingLeft: 32,
            textAlign: "center",
            maxWidth: "800px",
            marginLeft: "auto",
            marginRight: "auto",
          },
        },
      ],
      settings: {
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
  ],
  settings: {
    backgroundColor: { light: "#ffffff", dark: "#0f172a" },
  },
}; 