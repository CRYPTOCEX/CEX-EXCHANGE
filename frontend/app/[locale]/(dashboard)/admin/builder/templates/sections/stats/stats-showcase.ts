import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const statsShowcase: Section = {
  id: `section-${generateId("section")}`,
  type: "regular",
  rows: [
    // Header Row
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
              content: "Trusted by Industry Leaders",
              settings: {
                fontSize: 56,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 24,
                color: { light: "#0f172a", dark: "#f1f5f9" },
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
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
                "Numbers don't lie. See how we're making a real impact for businesses worldwide.",
              settings: {
                fontSize: 20,
                textAlign: "center",
                paddingLeft: 24,
                paddingRight: 24,
                marginBottom: 80,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.6,
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 0.4,
              },
            },
          ],
          settings: {},
          nestingLevel: 1,
        },
      ],
      settings: {},
    },
    // Stats Row
    {
      id: `row-${generateId("row")}`,
      columns: [
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-3`,
              type: "text",
              content: "🚀",
              settings: {
                fontSize: 48,
                textAlign: "center",
                marginBottom: 24,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 0.6,
              },
            },
            {
              id: `element-${generateId("element")}-4`,
              type: "heading",
              content: "50,000+",
              settings: {
                fontSize: 56,
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#3b82f6", dark: "#60a5fa" },
                enableAnimation: true,
                animationType: "countUp",
                animationDuration: 2.5,
                animationDelay: 0.8,
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "heading",
              content: "Active Users",
              settings: {
                fontSize: 20,
                fontWeight: "600",
                textAlign: "center",
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.0,
              },
            },
          ],
          settings: {
            paddingTop: 40,
            paddingRight: 24,
            paddingBottom: 40,
            paddingLeft: 24,
            borderRadius: 20,
            backgroundColor: { light: "#ffffff", dark: "#1e293b" },
            boxShadow: {
              light: "0 10px 25px rgba(0,0,0,0.05)",
              dark: "0 10px 25px rgba(0,0,0,0.3)",
            },
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: { light: "#e2e8f0", dark: "#334155" },
            transition: "all 0.3s ease",
            hoverTransform: "translateY(-4px)",
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content: "⭐",
              settings: {
                fontSize: 48,
                textAlign: "center",
                marginBottom: 24,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 0.8,
              },
            },
            {
              id: `element-${generateId("element")}-7`,
              type: "heading",
              content: "4.9/5",
              settings: {
                fontSize: 56,
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#f59e0b", dark: "#fbbf24" },
                enableAnimation: true,
                animationType: "countUp",
                animationDuration: 2.5,
                animationDelay: 1.0,
              },
            },
            {
              id: `element-${generateId("element")}-8`,
              type: "heading",
              content: "Customer Rating",
              settings: {
                fontSize: 20,
                fontWeight: "600",
                textAlign: "center",
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.2,
              },
            },
          ],
          settings: {
            paddingTop: 40,
            paddingRight: 24,
            paddingBottom: 40,
            paddingLeft: 24,
            borderRadius: 20,
            backgroundColor: { light: "#ffffff", dark: "#1e293b" },
            boxShadow: {
              light: "0 10px 25px rgba(0,0,0,0.05)",
              dark: "0 10px 25px rgba(0,0,0,0.3)",
            },
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: { light: "#e2e8f0", dark: "#334155" },
            transition: "all 0.3s ease",
            hoverTransform: "translateY(-4px)",
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-9`,
              type: "text",
              content: "💰",
              settings: {
                fontSize: 48,
                textAlign: "center",
                marginBottom: 24,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 1.0,
              },
            },
            {
              id: `element-${generateId("element")}-10`,
              type: "heading",
              content: "$2.5B+",
              settings: {
                fontSize: 56,
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#10b981", dark: "#34d399" },
                enableAnimation: true,
                animationType: "countUp",
                animationDuration: 2.5,
                animationDelay: 1.2,
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "heading",
              content: "Revenue Generated",
              settings: {
                fontSize: 20,
                fontWeight: "600",
                textAlign: "center",
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.4,
              },
            },
          ],
          settings: {
            paddingTop: 40,
            paddingRight: 24,
            paddingBottom: 40,
            paddingLeft: 24,
            borderRadius: 20,
            backgroundColor: { light: "#ffffff", dark: "#1e293b" },
            boxShadow: {
              light: "0 10px 25px rgba(0,0,0,0.05)",
              dark: "0 10px 25px rgba(0,0,0,0.3)",
            },
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: { light: "#e2e8f0", dark: "#334155" },
            transition: "all 0.3s ease",
            hoverTransform: "translateY(-4px)",
          },
          nestingLevel: 1,
        },
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-12`,
              type: "text",
              content: "🌍",
              settings: {
                fontSize: 48,
                textAlign: "center",
                marginBottom: 24,
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 1.2,
              },
            },
            {
              id: `element-${generateId("element")}-13`,
              type: "heading",
              content: "150+",
              settings: {
                fontSize: 56,
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#8b5cf6", dark: "#a78bfa" },
                enableAnimation: true,
                animationType: "countUp",
                animationDuration: 2.5,
                animationDelay: 1.4,
              },
            },
            {
              id: `element-${generateId("element")}-14`,
              type: "heading",
              content: "Countries",
              settings: {
                fontSize: 20,
                fontWeight: "600",
                textAlign: "center",
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.6,
              },
            },
          ],
          settings: {
            paddingTop: 40,
            paddingRight: 24,
            paddingBottom: 40,
            paddingLeft: 24,
            borderRadius: 20,
            backgroundColor: { light: "#ffffff", dark: "#1e293b" },
            boxShadow: {
              light: "0 10px 25px rgba(0,0,0,0.05)",
              dark: "0 10px 25px rgba(0,0,0,0.3)",
            },
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: { light: "#e2e8f0", dark: "#334155" },
            transition: "all 0.3s ease",
            hoverTransform: "translateY(-4px)",
          },
          nestingLevel: 1,
        },
      ],
      settings: {
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "stretch",
      },
    },
  ],
  settings: {
    paddingTop: 120,
    paddingRight: 24,
    paddingBottom: 120,
    paddingLeft: 24,
    backgroundColor: { light: "#f8fafc", dark: "#0f172a" },
  },
  name: "Stats Showcase",
  description:
    "Impressive statistics section with animated counters and visual elements",
  category: "stats",
};
