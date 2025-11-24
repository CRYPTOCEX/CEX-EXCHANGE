import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const simplePricing: Section = {
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
              content: "Simple, Transparent Pricing",
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
                "Choose the perfect plan for your needs. No hidden fees, no surprises.",
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
    // Pricing Cards Row
    {
      id: `row-${generateId("row")}-cards`,
      columns: [
        // Basic Plan
        {
          id: `column-${generateId("column")}-basic`,
          width: 33.33,
          elements: [
            {
              id: `element-${generateId("element")}-3`,
              type: "text",
              content: "Basic",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 16,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-4`,
              type: "text",
              content: "$9",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 8,
                color: "#3b82f6",
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content: "per month",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: "#64748b",
              },
            },
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content:
                "✓ 5 Projects\n✓ 10GB Storage\n✓ Email Support\n✓ Basic Analytics",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: "#475569",
                lineHeight: 2,
              },
            },
            {
              id: `element-${generateId("element")}-7`,
              type: "button",
              content: "Get Started",
              settings: {
                backgroundColor: "#f1f5f9",
                color: "#1e293b",
                fontSize: 16,
                fontWeight: "600",
                paddingTop: 12,
                paddingRight: 24,
                paddingBottom: 12,
                paddingLeft: 24,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              },
            },
          ],
          settings: {
            backgroundColor: "#ffffff",
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: "#e2e8f0",
            borderRadius: 16,
            paddingTop: 40,
            paddingRight: 32,
            paddingBottom: 40,
            paddingLeft: 32,
            marginRight: 16,
          },
          nestingLevel: 1,
        },
        // Pro Plan
        {
          id: `column-${generateId("column")}-pro`,
          width: 33.33,
          elements: [
            {
              id: `element-${generateId("element")}-8`,
              type: "text",
              content: "Pro",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 16,
                color: "#ffffff",
              },
            },
            {
              id: `element-${generateId("element")}-9`,
              type: "text",
              content: "$29",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 8,
                color: "#ffffff",
              },
            },
            {
              id: `element-${generateId("element")}-10`,
              type: "text",
              content: "per month",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: "#e2e8f0",
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "text",
              content:
                "✓ 25 Projects\n✓ 100GB Storage\n✓ Priority Support\n✓ Advanced Analytics\n✓ Team Collaboration",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: "#e2e8f0",
                lineHeight: 2,
              },
            },
            {
              id: `element-${generateId("element")}-12`,
              type: "button",
              content: "Start Free Trial",
              settings: {
                backgroundColor: "#ffffff",
                color: "#3b82f6",
                fontSize: 16,
                fontWeight: "600",
                paddingTop: 12,
                paddingRight: 24,
                paddingBottom: 12,
                paddingLeft: 24,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              },
            },
          ],
          settings: {
            backgroundColor: "#3b82f6",
            borderRadius: 16,
            paddingTop: 40,
            paddingRight: 32,
            paddingBottom: 40,
            paddingLeft: 32,
            marginRight: 8,
            marginLeft: 8,
          },
          nestingLevel: 1,
        },
        // Enterprise Plan
        {
          id: `column-${generateId("column")}-enterprise`,
          width: 33.33,
          elements: [
            {
              id: `element-${generateId("element")}-13`,
              type: "text",
              content: "Enterprise",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 16,
                color: "#1e293b",
              },
            },
            {
              id: `element-${generateId("element")}-14`,
              type: "text",
              content: "$99",
              settings: {
                fontSize: 48,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 8,
                color: "#7c3aed",
              },
            },
            {
              id: `element-${generateId("element")}-15`,
              type: "text",
              content: "per month",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: "#64748b",
              },
            },
            {
              id: `element-${generateId("element")}-16`,
              type: "text",
              content:
                "✓ Unlimited Projects\n✓ 1TB Storage\n✓ 24/7 Phone Support\n✓ Custom Analytics\n✓ Advanced Security\n✓ API Access",
              settings: {
                fontSize: 16,
                textAlign: "center",
                marginBottom: 32,
                color: "#475569",
                lineHeight: 2,
              },
            },
            {
              id: `element-${generateId("element")}-17`,
              type: "button",
              content: "Contact Sales",
              settings: {
                backgroundColor: "#7c3aed",
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
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              },
            },
          ],
          settings: {
            backgroundColor: "#ffffff",
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: "#e2e8f0",
            borderRadius: 16,
            paddingTop: 40,
            paddingRight: 32,
            paddingBottom: 40,
            paddingLeft: 32,
            marginLeft: 16,
          },
          nestingLevel: 1,
        },
      ],
      settings: {
        display: "flex",
        alignItems: "stretch",
        gap: 0,
      },
    },
  ],
  settings: {
    paddingTop: 120,
    paddingRight: 24,
    paddingBottom: 120,
    paddingLeft: 24,
    backgroundColor: "#f8fafc",
  },
  name: "Simple Pricing",
  description:
    "Clean and simple 3-tier pricing cards with clear feature comparisons",
  category: "pricing",
};
