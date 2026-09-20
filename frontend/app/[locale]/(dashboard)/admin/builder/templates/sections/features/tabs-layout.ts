import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const tabButton = (label: string, active = false) =>
  el.button(label, "#", {
    backgroundColor: active ? theme.primary : "transparent",
    color: active ? theme.primaryText : theme.textMuted,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? theme.primary : theme.border,
    borderRadius: 999,
    fontSize: 14,
    fontWeight: "600",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    marginRight: 8,
    marginTop: 0,
  });

export const featuresTabsLayout: Section = section(
  [
    singleColumnRow([
      el.heading("One platform. Every team.", {
        level: "h2",
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
      }),
      el.text(
        "Tailored views for engineering, design, and operations — on the same source of truth.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 40,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(100, [
          tabButton("For engineering", true),
          tabButton("For product"),
          tabButton("For design"),
          tabButton("For operations"),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center", marginBottom: 48 }
    ),
    row(
      [
        col(55, [
          el.text("FOR ENGINEERING", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.2em",
            marginBottom: 16,
          }),
          el.heading("From commit to production in 90 seconds", {
            level: "h3",
            fontSize: 34,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 16,
            letterSpacing: "-0.02em",
            lineHeight: "1.15",
          }),
          el.text(
            "Preview deployments on every PR, automatic rollbacks, and runtime logs correlated to git SHAs.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 24,
              lineHeight: "1.7",
            }
          ),
          el.list([
            "Automatic preview URLs per branch",
            "Instant rollback on health-check failure",
            "Distributed tracing out of the box",
            "Deploy from CLI, GitHub, or API",
          ], { fontSize: 15, color: theme.text }),
        ]),
        col(45, [
          el.image(
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80",
            "Engineering dashboard with deployment pipeline view",
            {
              borderRadius: 16,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.border,
              boxShadowX: 0,
              boxShadowY: 24,
              boxShadowBlur: 48,
              boxShadowColor: "rgba(10,18,32,0.12)",
            }
          ),
        ]),
      ],
      {
        ...rowPresets.wide,
        gutter: 56,
        backgroundColor: theme.bgCard,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border,
        borderRadius: 20,
        paddingTop: 48,
        paddingBottom: 48,
        paddingLeft: 40,
        paddingRight: 40,
      }
    ),
  ],
  {
    name: "Tabs Layout Features",
    description: "Feature section styled as a tab bar over a rich detail panel",
    category: "features",
    slug: "features-tabs-layout",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
