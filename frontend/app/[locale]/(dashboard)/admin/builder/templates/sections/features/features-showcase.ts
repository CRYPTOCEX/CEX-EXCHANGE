import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const featuresShowcase: Section = {
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
              content: "Features That Drive Results",
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
              content:
                "Discover powerful features designed to transform your workflow",
              settings: {
                fontSize: 18,
                textAlign: "center",
                marginBottom: 80,
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
      id: `row-${generateId("row")}-1`,
      columns: [
        {
          id: `column-${generateId("column")}-1-img`,
          width: 50,
          elements: [
            {
              id: `element-${generateId("element")}-3`,
              type: "image",
              content:
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
              settings: {
                borderRadius: 16,
                alt: "Advanced Analytics Dashboard",
              },
            },
          ],
          settings: {
            paddingRight: 40,
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-1-text`,
          width: 50,
          elements: [
            {
              id: `element-${generateId("element")}-4`,
              type: "heading",
              content: "Advanced Analytics",
              settings: {
                fontSize: 36,
                fontWeight: "700",
                marginBottom: 20,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content:
                "Get deep insights into your business performance with our advanced analytics dashboard. Track key metrics, identify trends, and make data-driven decisions that propel your business forward.",
              settings: {
                fontSize: 18,
                marginBottom: 32,
                color: "#64748b",
                lineHeight: 1.7,
              },
            },
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content:
                "• Real-time data visualization\n• Custom reporting tools\n• Performance benchmarking\n• Predictive analytics",
              settings: {
                fontSize: 16,
                marginBottom: 32,
                color: "#475569",
                lineHeight: 1.8,
              },
            },
            {
              id: `element-${generateId("element")}-7`,
              type: "button",
              content: "Learn More",
              settings: {
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: "600",
                paddingTop: 12,
                paddingRight: 24,
                paddingBottom: 12,
                paddingLeft: 24,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              },
            },
          ],
          settings: {
            paddingLeft: 40,
          },
          nestingLevel: 1,
        },
      ],
      settings: {
        marginBottom: 100,
      },
    },
    {
      id: `row-${generateId("row")}-2`,
      columns: [
        {
          id: `column-${generateId("column")}-2-text`,
          width: 50,
          elements: [
            {
              id: `element-${generateId("element")}-8`,
              type: "heading",
              content: "Team Collaboration",
              settings: {
                fontSize: 36,
                fontWeight: "700",
                marginBottom: 20,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-9`,
              type: "text",
              content:
                "Work seamlessly with your team using our collaborative tools. Share projects, communicate in real-time, and keep everyone aligned on goals and progress.",
              settings: {
                fontSize: 18,
                marginBottom: 32,
                color: "#64748b",
                lineHeight: 1.7,
              },
            },
            {
              id: `element-${generateId("element")}-10`,
              type: "text",
              content:
                "• Real-time collaboration\n• Shared workspaces\n• Team communication\n• Project management",
              settings: {
                fontSize: 16,
                marginBottom: 32,
                color: "#475569",
                lineHeight: 1.8,
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "button",
              content: "Start Collaborating",
              settings: {
                backgroundColor: "#10b981",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: "600",
                paddingTop: 12,
                paddingRight: 24,
                paddingBottom: 12,
                paddingLeft: 24,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              },
            },
          ],
          settings: {
            paddingRight: 40,
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-2-img`,
          width: 50,
          elements: [
            {
              id: `element-${generateId("element")}-12`,
              type: "image",
              content:
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop",
              settings: {
                borderRadius: 16,
                alt: "Team Collaboration Tools",
              },
            },
          ],
          settings: {
            paddingLeft: 40,
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
  name: "Features Showcase",
  description: "Large feature showcase with alternating image and text layouts",
  category: "features",
};
