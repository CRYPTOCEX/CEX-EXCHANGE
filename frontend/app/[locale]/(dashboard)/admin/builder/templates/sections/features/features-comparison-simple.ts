import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const featuresComparisonSimple: Section = {
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
              content: "Compare Our Plans",
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
              content: "Choose the perfect plan for your business needs",
              settings: {
                fontSize: 18,
                textAlign: "center",
                marginBottom: 60,
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
    // Simple comparison row
    {
      id: `row-${generateId("row")}-comparison`,
      columns: [
        {
          id: `column-${generateId("column")}-1`,
          width: 33.33,
          elements: [
            {
              id: `element-${generateId("element")}-3`,
              type: "heading",
              content: "Basic Plan",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 20,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 0.6,
              },
            },
            {
              id: `element-${generateId("element")}-4`,
              type: "text",
              content:
                "✅ Dashboard Access\n✅ Basic Analytics\n✅ Email Support\n❌ Advanced Features\n❌ Priority Support",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: { light: "#475569", dark: "#cbd5e1" },
                lineHeight: 2,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 0.8,
              },
            },
          ],
          settings: {
            backgroundColor: { light: "#ffffff", dark: "#0f172a" },
            borderRadius: 12,
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
              id: `element-${generateId("element")}-5`,
              type: "heading",
              content: "Pro Plan",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 20,
                color: { light: "#3b82f6", dark: "#60a5fa" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 0.8,
              },
            },
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content:
                "✅ Dashboard Access\n✅ Advanced Analytics\n✅ Priority Support\n✅ Team Collaboration\n✅ API Access",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: { light: "#475569", dark: "#cbd5e1" },
                lineHeight: 2,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 1.0,
              },
            },
          ],
          settings: {
            backgroundColor: { light: "#eff6ff", dark: "#1e3a8a" },
            borderRadius: 12,
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
              id: `element-${generateId("element")}-7`,
              type: "heading",
              content: "Enterprise Plan",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 20,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.0,
              },
            },
            {
              id: `element-${generateId("element")}-8`,
              type: "text",
              content:
                "✅ Everything in Pro\n✅ Custom Integrations\n✅ Dedicated Support\n✅ Advanced Security\n✅ Custom Analytics",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: { light: "#475569", dark: "#cbd5e1" },
                lineHeight: 2,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.8,
                animationDelay: 1.2,
              },
            },
          ],
          settings: {
            backgroundColor: { light: "#ffffff", dark: "#0f172a" },
            borderRadius: 12,
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
            paddingLeft: 24,
            marginLeft: 16,
          },
          nestingLevel: 1,
        },
      ],
      settings: {
        display: "flex",
        alignItems: "stretch",
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
  name: "Features Comparison",
  description: "Side-by-side feature comparison cards with checkmarks",
  category: "features",
};
