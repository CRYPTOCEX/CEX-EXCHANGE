import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const benefitRow = (icon: string, title: string, body: string) => [
  el.icon(icon, {
    size: 24,
    color: theme.emerald,
    marginBottom: 0,
    backgroundColor: "rgba(14,159,111,0.14)",
    borderRadius: 999,
    padding: 8,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: "-0.01em",
  }),
  el.text(body, {
    fontSize: 15,
    color: theme.textMuted,
    lineHeight: "1.65",
    marginBottom: 32,
  }),
];

export const featuresFeatureListCheck: Section = section(
  [
    row(
      [
        col(55, [
          el.text("WHY TEAMS SWITCH", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.emerald,
            letterSpacing: "0.2em",
            marginBottom: 16,
          }),
          el.heading("Everything that used to be painful, solved.", {
            level: "h2",
            fontSize: 44,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.03em",
            lineHeight: "1.12",
          }),
          el.text(
            "We rebuilt the workflow from first principles so your team spends less time fighting tools and more time shipping.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 48,
              lineHeight: "1.7",
              maxWidth: "520px",
            }
          ),
          // Two-column benefit grid — use nested row via children? Use horizontal list of benefits
          ...benefitRow(
            "lucide:check",
            "Zero-config deploys",
            "Detect frameworks, set defaults, and push to production without editing a single YAML file."
          ),
          ...benefitRow(
            "lucide:check",
            "Unified observability",
            "Logs, traces, and metrics correlated to the git SHA and workflow run out of the box."
          ),
          ...benefitRow(
            "lucide:check",
            "Predictable pricing",
            "Usage-based billing with clear caps and anomaly alerts — no surprise invoices at month end."
          ),
          ...benefitRow(
            "lucide:check",
            "Enterprise-ready on day one",
            "SSO, SCIM, audit logs, and role-based access included in every plan."
          ),
        ]),
        col(45, [
          el.image(
            "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80",
            "Team member reviewing product metrics on a laptop",
            {
              borderRadius: 20,
              boxShadowX: 0,
              boxShadowY: 24,
              boxShadowBlur: 48,
              boxShadowColor: "rgba(10,18,32,0.14)",
              height: "auto",
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "top" }
    ),
  ],
  {
    name: "Feature List with Checks",
    description: "Two-column layout with checkmarked benefit list and sidebar image",
    category: "features",
    slug: "features-feature-list-check",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
