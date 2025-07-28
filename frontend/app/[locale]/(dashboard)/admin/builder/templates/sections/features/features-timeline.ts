import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const featuresTimeline: Section = {
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
              content: "Evolution of Excellence",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#0f172a", dark: "#f1f5f9" },
                lineHeight: 1.2,
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.8,
                animationDelay: 0.2,
              },
            },
            {
              id: `element-${generateId("element")}-2`,
              type: "text",
              content:
                "See how our platform has evolved to meet your growing needs",
              settings: {
                fontSize: 18,
                textAlign: "center",
                marginBottom: 80,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.6,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 0.4,
              },
            },
          ],
          nestingLevel: 1,
        },
      ],
    },
    // Timeline Step 1
    {
      id: `row-${generateId("row")}-1`,
      columns: [
        {
          id: `column-${generateId("column")}-1`,
          width: 20,
          elements: [
            {
              id: `element-${generateId("element")}-3`,
              type: "text",
              content: "1",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                color: { light: "#3b82f6", dark: "#60a5fa" },
                backgroundColor: { light: "#eff6ff", dark: "#1e3a8a" },
                paddingTop: 20,
                paddingRight: 20,
                paddingBottom: 20,
                paddingLeft: 20,
                borderRadius: 50,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 0.6,
              },
            },
          ],
          settings: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-1-content`,
          width: 80,
          elements: [
            {
              id: `element-${generateId("element")}-4`,
              type: "heading",
              content: "Foundation",
              settings: {
                fontSize: 32,
                fontWeight: "700",
                marginBottom: 16,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideLeft",
                animationDuration: 0.8,
                animationDelay: 0.8,
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content:
                "Started with core functionality - user management, basic analytics, and essential tools to get your business running smoothly.",
              settings: {
                fontSize: 18,
                marginBottom: 40,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.7,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 1.0,
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
        display: "flex",
        alignItems: "center",
        marginBottom: 60,
      },
    },
    // Timeline Step 2
    {
      id: `row-${generateId("row")}-2`,
      columns: [
        {
          id: `column-${generateId("column")}-2`,
          width: 20,
          elements: [
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content: "2",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                color: { light: "#10b981", dark: "#34d399" },
                backgroundColor: { light: "#ecfdf5", dark: "#064e3b" },
                paddingTop: 20,
                paddingRight: 20,
                paddingBottom: 20,
                paddingLeft: 20,
                borderRadius: 50,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 1.2,
              },
            },
          ],
          settings: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-2-content`,
          width: 80,
          elements: [
            {
              id: `element-${generateId("element")}-7`,
              type: "heading",
              content: "Collaboration",
              settings: {
                fontSize: 32,
                fontWeight: "700",
                marginBottom: 16,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideLeft",
                animationDuration: 0.8,
                animationDelay: 1.4,
              },
            },
            {
              id: `element-${generateId("element")}-8`,
              type: "text",
              content:
                "Added team collaboration features - shared workspaces, real-time editing, commenting system, and communication tools.",
              settings: {
                fontSize: 18,
                marginBottom: 40,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.7,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 1.6,
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
        display: "flex",
        alignItems: "center",
        marginBottom: 60,
      },
    },
    // Timeline Step 3
    {
      id: `row-${generateId("row")}-3`,
      columns: [
        {
          id: `column-${generateId("column")}-3`,
          width: 20,
          elements: [
            {
              id: `element-${generateId("element")}-9`,
              type: "text",
              content: "3",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                color: { light: "#f59e0b", dark: "#fbbf24" },
                backgroundColor: { light: "#fffbeb", dark: "#451a03" },
                paddingTop: 20,
                paddingRight: 20,
                paddingBottom: 20,
                paddingLeft: 20,
                borderRadius: 50,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 1.8,
              },
            },
          ],
          settings: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-3-content`,
          width: 80,
          elements: [
            {
              id: `element-${generateId("element")}-10`,
              type: "heading",
              content: "Intelligence",
              settings: {
                fontSize: 32,
                fontWeight: "700",
                marginBottom: 16,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideLeft",
                animationDuration: 0.8,
                animationDelay: 2.0,
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "text",
              content:
                "Integrated AI-powered features - predictive analytics, automated workflows, smart recommendations, and intelligent insights.",
              settings: {
                fontSize: 18,
                marginBottom: 40,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.7,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 2.2,
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
        display: "flex",
        alignItems: "center",
        marginBottom: 60,
      },
    },
    // Timeline Step 4
    {
      id: `row-${generateId("row")}-4`,
      columns: [
        {
          id: `column-${generateId("column")}-4`,
          width: 20,
          elements: [
            {
              id: `element-${generateId("element")}-12`,
              type: "text",
              content: "4",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                color: { light: "#8b5cf6", dark: "#a78bfa" },
                backgroundColor: { light: "#f5f3ff", dark: "#3c1361" },
                paddingTop: 20,
                paddingRight: 20,
                paddingBottom: 20,
                paddingLeft: 20,
                borderRadius: 50,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 2.4,
              },
            },
          ],
          settings: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}-4-content`,
          width: 80,
          elements: [
            {
              id: `element-${generateId("element")}-13`,
              type: "heading",
              content: "Enterprise",
              settings: {
                fontSize: 32,
                fontWeight: "700",
                marginBottom: 16,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideLeft",
                animationDuration: 0.8,
                animationDelay: 2.6,
              },
            },
            {
              id: `element-${generateId("element")}-14`,
              type: "text",
              content:
                "Scaled to enterprise level - advanced security, compliance tools, custom integrations, and dedicated support for large organizations.",
              settings: {
                fontSize: 18,
                marginBottom: 40,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.7,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 2.8,
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
        display: "flex",
        alignItems: "center",
      },
    },
  ],
  settings: {
    paddingTop: 120,
    paddingRight: 24,
    paddingBottom: 120,
    paddingLeft: 24,
    backgroundColor: { light: "#f8fafc", dark: "#020617" },
  },
  name: "Features Timeline",
  description:
    "Timeline showing the evolution and development of platform features",
  category: "features",
};
