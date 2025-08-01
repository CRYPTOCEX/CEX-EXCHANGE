import type { Section } from "@/types/builder";
import { generateId } from "@/store/builder-store";

export const teamGrid: Section = {
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
              content: "Meet Our Amazing Team",
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
                "The talented people behind our success. We're passionate about what we do and dedicated to helping you succeed.",
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
    // Team Row 1
    {
      id: `row-${generateId("row")}`,
      columns: [
        // Team Member 1
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-3`,
              type: "image",
              content:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
              settings: {
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: 20,
                marginBottom: 24,
                objectFit: "cover",
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 0.6,
              },
            },
            {
              id: `element-${generateId("element")}-4`,
              type: "heading",
              content: "Alex Johnson",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 8,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 0.8,
              },
            },
            {
              id: `element-${generateId("element")}-5`,
              type: "text",
              content: "CEO & Founder",
              settings: {
                fontSize: 16,
                fontWeight: "500",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#3b82f6", dark: "#60a5fa" },
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.0,
              },
            },
            {
              id: `element-${generateId("element")}-6`,
              type: "text",
              content:
                "Passionate about building products that make a difference. 10+ years in tech leadership.",
              settings: {
                fontSize: 14,
                textAlign: "center",
                marginBottom: 20,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.6,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.2,
              },
            },
            {
              id: `element-${generateId("element")}-7`,
              type: "text",
              content: "🔗 💼 📧",
              settings: {
                fontSize: 20,
                textAlign: "center",
                color: { light: "#64748b", dark: "#94a3b8" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.4,
              },
            },
          ],
          settings: {
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
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
        // Team Member 2
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-8`,
              type: "image",
              content:
                "https://images.unsplash.com/photo-1494790108755-2616c078e5b8?w=300&h=300&fit=crop&crop=face",
              settings: {
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: 20,
                marginBottom: 24,
                objectFit: "cover",
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 0.7,
              },
            },
            {
              id: `element-${generateId("element")}-9`,
              type: "heading",
              content: "Sarah Chen",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 8,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 0.9,
              },
            },
            {
              id: `element-${generateId("element")}-10`,
              type: "text",
              content: "Head of Design",
              settings: {
                fontSize: 16,
                fontWeight: "500",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#10b981", dark: "#34d399" },
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.1,
              },
            },
            {
              id: `element-${generateId("element")}-11`,
              type: "text",
              content:
                "Creative visionary with a keen eye for detail. Loves creating beautiful, user-friendly experiences.",
              settings: {
                fontSize: 14,
                textAlign: "center",
                marginBottom: 20,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.6,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.3,
              },
            },
            {
              id: `element-${generateId("element")}-12`,
              type: "text",
              content: "🎨 📱 🌐",
              settings: {
                fontSize: 20,
                textAlign: "center",
                color: { light: "#64748b", dark: "#94a3b8" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.5,
              },
            },
          ],
          settings: {
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
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
        // Team Member 3
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-13`,
              type: "image",
              content:
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
              settings: {
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: 20,
                marginBottom: 24,
                objectFit: "cover",
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 0.8,
              },
            },
            {
              id: `element-${generateId("element")}-14`,
              type: "heading",
              content: "Marcus Rodriguez",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 8,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.0,
              },
            },
            {
              id: `element-${generateId("element")}-15`,
              type: "text",
              content: "Lead Developer",
              settings: {
                fontSize: 16,
                fontWeight: "500",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#8b5cf6", dark: "#a78bfa" },
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.2,
              },
            },
            {
              id: `element-${generateId("element")}-16`,
              type: "text",
              content:
                "Full-stack wizard who turns complex problems into elegant solutions. Coffee enthusiast and code poet.",
              settings: {
                fontSize: 14,
                textAlign: "center",
                marginBottom: 20,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.6,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.4,
              },
            },
            {
              id: `element-${generateId("element")}-17`,
              type: "text",
              content: "💻 ⚡ 🚀",
              settings: {
                fontSize: 20,
                textAlign: "center",
                color: { light: "#64748b", dark: "#94a3b8" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.6,
              },
            },
          ],
          settings: {
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
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
        // Team Member 4
        {
          id: `column-${generateId("column")}`,
          width: 25,
          elements: [
            {
              id: `element-${generateId("element")}-18`,
              type: "image",
              content:
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
              settings: {
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: 20,
                marginBottom: 24,
                objectFit: "cover",
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.8,
                animationDelay: 0.9,
              },
            },
            {
              id: `element-${generateId("element")}-19`,
              type: "heading",
              content: "Emily Davis",
              settings: {
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 8,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.1,
              },
            },
            {
              id: `element-${generateId("element")}-20`,
              type: "text",
              content: "Marketing Director",
              settings: {
                fontSize: 16,
                fontWeight: "500",
                textAlign: "center",
                marginBottom: 16,
                color: { light: "#f59e0b", dark: "#fbbf24" },
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.3,
              },
            },
            {
              id: `element-${generateId("element")}-21`,
              type: "text",
              content:
                "Growth hacker and brand storyteller. Transforms data into compelling narratives that drive results.",
              settings: {
                fontSize: 14,
                textAlign: "center",
                marginBottom: 20,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.6,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 1.5,
              },
            },
            {
              id: `element-${generateId("element")}-22`,
              type: "text",
              content: "📈 📊 ✨",
              settings: {
                fontSize: 20,
                textAlign: "center",
                color: { light: "#64748b", dark: "#94a3b8" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.6,
                animationDelay: 1.7,
              },
            },
          ],
          settings: {
            paddingTop: 32,
            paddingRight: 24,
            paddingBottom: 32,
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
    // CTA Row
    {
      id: `row-${generateId("row")}`,
      columns: [
        {
          id: `column-${generateId("column")}`,
          width: 100,
          elements: [
            {
              id: `element-${generateId("element")}-23`,
              type: "heading",
              content: "Want to Join Our Team?",
              settings: {
                fontSize: 32,
                fontWeight: "700",
                textAlign: "center",
                marginTop: 80,
                marginBottom: 16,
                color: { light: "#1e293b", dark: "#f1f5f9" },
                enableAnimation: true,
                animationType: "slideUp",
                animationDuration: 0.8,
                animationDelay: 1.8,
              },
            },
            {
              id: `element-${generateId("element")}-24`,
              type: "text",
              content:
                "We're always looking for talented people to join our mission. Check out our open positions.",
              settings: {
                fontSize: 18,
                textAlign: "center",
                marginBottom: 32,
                color: { light: "#64748b", dark: "#94a3b8" },
                lineHeight: 1.6,
                enableAnimation: true,
                animationType: "fadeIn",
                animationDuration: 0.6,
                animationDelay: 2.0,
              },
            },
            {
              id: `element-${generateId("element")}-25`,
              type: "button",
              content: "View Open Positions",
              settings: {
                backgroundColor: { light: "#3b82f6", dark: "#3b82f6" },
                hoverBackgroundColor: { light: "#2563eb", dark: "#2563eb" },
                color: { light: "#ffffff", dark: "#ffffff" },
                fontSize: 18,
                fontWeight: "600",
                textAlign: "center",
                paddingTop: 18,
                paddingRight: 48,
                paddingBottom: 18,
                paddingLeft: 48,
                borderRadius: 12,
                boxShadow: {
                  light: "0 4px 14px rgba(59, 130, 246, 0.3)",
                  dark: "0 4px 14px rgba(59, 130, 246, 0.4)",
                },
                transition: "all 0.3s ease",
                hoverTransform: "translateY(-2px)",
                hoverBoxShadow: {
                  light: "0 8px 25px rgba(59, 130, 246, 0.4)",
                  dark: "0 8px 25px rgba(59, 130, 246, 0.5)",
                },
                enableAnimation: true,
                animationType: "zoomIn",
                animationDuration: 0.6,
                animationDelay: 2.2,
              },
            },
          ],
          settings: {
            textAlign: "center",
          },
          nestingLevel: 1,
        },
      ],
      settings: {},
    },
  ],
  settings: {
    paddingTop: 120,
    paddingRight: 24,
    paddingBottom: 120,
    paddingLeft: 24,
    backgroundColor: { light: "#f8fafc", dark: "#0f172a" },
  },
  name: "Team Grid",
  description:
    "Beautiful team section with member photos, roles, and descriptions",
  category: "team",
};
