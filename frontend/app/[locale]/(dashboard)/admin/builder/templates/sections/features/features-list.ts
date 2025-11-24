import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const featuresList: Section = {
  id: `section-${generateId("section")}`,
  type: "regular",
  rows: [
    {
      id: `row-${generateId("row")}`,
      columns: [
        {
          id: `column-${generateId("column")}`,
          width: 50,
          elements: [
            {
              id: `element-${generateId("element")}-1`,
              type: "heading",
              content: "Everything You Need to Succeed",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                marginBottom: 24,
                color: "#0f172a",
                lineHeight: 1.2,
              },
            },
            {
              id: `element-${generateId("element")}-2`,
              type: "text",
              content:
                "Our comprehensive platform provides all the tools and features you need to grow your business efficiently.",
              settings: {
                fontSize: 18,
                marginBottom: 40,
                color: "#64748b",
                lineHeight: 1.6,
              },
            },
            {
              id: `element-${generateId("element")}-3`,
              type: "text",
              content: "✅ Advanced Analytics Dashboard",
              settings: {
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 8,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-4`,
              type: "text",
              content:
                "Get real-time insights with comprehensive analytics and detailed reporting to make data-driven decisions.",
              settings: {
                fontSize: 16,
                marginBottom: 24,
                color: "#64748b",
                lineHeight: 1.5,
                paddingLeft: 24,
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content: "✅ Team Collaboration Tools",
              settings: {
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 8,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content:
                "Seamless collaboration with shared workspaces, real-time editing, and communication tools.",
              settings: {
                fontSize: 16,
                marginBottom: 24,
                color: "#64748b",
                lineHeight: 1.5,
                paddingLeft: 24,
              },
            },
            {
              id: `element-${generateId("element")}-7`,
              type: "text",
              content: "✅ Enterprise Security",
              settings: {
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 8,
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
                marginBottom: 24,
                color: "#64748b",
                lineHeight: 1.5,
                paddingLeft: 24,
              },
            },
            {
              id: `element-${generateId("element")}-9`,
              type: "text",
              content: "✅ 24/7 Premium Support",
              settings: {
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 8,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-10`,
              type: "text",
              content:
                "Get expert help whenever you need it with our dedicated support team available around the clock.",
              settings: {
                fontSize: 16,
                marginBottom: 32,
                color: "#64748b",
                lineHeight: 1.5,
                paddingLeft: 24,
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "button",
              content: "Start Free Trial",
              settings: {
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: "600",
                paddingTop: 16,
                paddingRight: 32,
                paddingBottom: 16,
                paddingLeft: 32,
                borderRadius: 12,
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
          id: `column-${generateId("column")}`,
          width: 50,
          elements: [
            {
              id: `element-${generateId("element")}-12`,
              type: "image",
              content:
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
              settings: {
                borderRadius: 20,
                alt: "Award-winning platform dashboard",
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
    backgroundColor: "#ffffff",
  },
  name: "Features List",
  description:
    "Comprehensive features list with checkmarks and supporting image",
  category: "features",
};
