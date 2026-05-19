import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const featuresSimple: Section = {
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
              content: "Amazing Features",
              settings: {
                fontSize: 48,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 16,
                color: "#0f172a",
              },
            },
            {
              id: `element-${generateId("element")}-2`,
              type: "text",
              content:
                "Discover powerful features designed to transform your workflow",
              settings: {
                fontSize: 18,
                textAlign: "center",
                marginBottom: 40,
                color: "#64748b",
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
                marginBottom: 16,
              },
            },
            {
              id: `element-${generateId("element")}-4`,
              type: "heading",
              content: "Lightning Fast",
              settings: {
                fontSize: 24,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 12,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content: "Optimized for speed and performance",
              settings: {
                fontSize: 16,
                textAlign: "center",
                color: "#64748b",
              },
            },
          ],
          settings: {
            paddingTop: 24,
            paddingRight: 16,
            paddingBottom: 24,
            paddingLeft: 16,
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
                marginBottom: 16,
              },
            },
            {
              id: `element-${generateId("element")}-7`,
              type: "heading",
              content: "Secure",
              settings: {
                fontSize: 24,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 12,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-8`,
              type: "text",
              content: "Enterprise-grade security",
              settings: {
                fontSize: 16,
                textAlign: "center",
                color: "#64748b",
              },
            },
          ],
          settings: {
            paddingTop: 24,
            paddingRight: 16,
            paddingBottom: 24,
            paddingLeft: 16,
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
                marginBottom: 16,
              },
            },
            {
              id: `element-${generateId("element")}-10`,
              type: "heading",
              content: "Analytics",
              settings: {
                fontSize: 24,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 12,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "text",
              content: "Advanced reporting and insights",
              settings: {
                fontSize: 16,
                textAlign: "center",
                color: "#64748b",
              },
            },
          ],
          settings: {
            paddingTop: 24,
            paddingRight: 16,
            paddingBottom: 24,
            paddingLeft: 16,
          },
          nestingLevel: 1,
        },
      ],
    },
  ],
  settings: {
    paddingTop: 80,
    paddingRight: 24,
    paddingBottom: 80,
    paddingLeft: 24,
    backgroundColor: "#ffffff",
  },
  name: "Simple Features",
  description: "Simple features section without problematic properties",
  category: "features",
};
