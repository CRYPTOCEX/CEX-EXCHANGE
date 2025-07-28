import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const modernFeaturesGrid: Section = {
  id: `section-${generateId("section")}`,
  type: "regular",
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
              content: "Powerful Features",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 16,
                color: "#0f172a",
                lineHeight: 1.2,
              },
            },
            {
              id: `element-${generateId("element")}-2`,
              type: "text",
              content: "Everything you need to build amazing products",
              settings: {
                fontSize: 18,
                textAlign: "center",
                marginBottom: 60,
                color: "#64748b",
                lineHeight: 1.6,
              },
            },
          ],
          nestingLevel: 1,
        },
      ],
    },
    {
      id: `row-${generateId("row")}-features`,
      columns: [
        {
          id: `column-${generateId("column")}-1`,
          width: 33.33,
          elements: [
            {
              id: `element-${generateId("element")}-3`,
              type: "text",
              content: "⚡",
              settings: {
                fontSize: 48,
                textAlign: "center",
                marginBottom: 20,
              },
            },
            {
              id: `element-${generateId("element")}-4`,
              type: "heading",
              content: "Lightning Fast Performance",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 16,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content:
                "Optimized for speed with advanced caching and CDN integration for blazing fast load times.",
              settings: {
                fontSize: 16,
                textAlign: "center",
                color: "#64748b",
                lineHeight: 1.6,
              },
            },
          ],
          settings: {
            backgroundColor: "#ffffff",
            borderRadius: 16,
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
            paddingLeft: 24,
            marginRight: 16,
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-2`,
          width: 33.33,
          elements: [
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content: "🔒",
              settings: {
                fontSize: 48,
                textAlign: "center",
                marginBottom: 20,
              },
            },
            {
              id: `element-${generateId("element")}-7`,
              type: "heading",
              content: "Enterprise Security",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 16,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-8`,
              type: "text",
              content:
                "Bank-grade encryption, SOC 2 compliance, and advanced security protocols protect your data.",
              settings: {
                fontSize: 16,
                textAlign: "center",
                color: "#64748b",
                lineHeight: 1.6,
              },
            },
          ],
          settings: {
            backgroundColor: "#ffffff",
            borderRadius: 16,
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
            paddingLeft: 24,
            marginRight: 8,
            marginLeft: 8,
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-3`,
          width: 33.33,
          elements: [
            {
              id: `element-${generateId("element")}-9`,
              type: "text",
              content: "📊",
              settings: {
                fontSize: 48,
                textAlign: "center",
                marginBottom: 20,
              },
            },
            {
              id: `element-${generateId("element")}-10`,
              type: "heading",
              content: "Advanced Analytics",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 16,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "text",
              content:
                "Deep insights with real-time analytics, custom reports, and AI-powered recommendations.",
              settings: {
                fontSize: 16,
                textAlign: "center",
                color: "#64748b",
                lineHeight: 1.6,
              },
            },
          ],
          settings: {
            backgroundColor: "#ffffff",
            borderRadius: 16,
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
            paddingLeft: 24,
            marginLeft: 16,
          },
          nestingLevel: 1,
        },
      ],
    },
  ],
  settings: {
    paddingTop: 120,
    paddingRight: 24,
    paddingBottom: 120,
    paddingLeft: 24,
    backgroundColor: "#f8fafc",
  },
  name: "Modern Features Grid",
  description: "Stunning 3-column features grid with animated cards and icons",
  category: "features",
};
