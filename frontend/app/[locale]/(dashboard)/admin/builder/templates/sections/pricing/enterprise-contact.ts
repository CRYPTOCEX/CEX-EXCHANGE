import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const pricingEnterpriseContact: Section = section(
  [
    singleColumnRow([
      el.text("PRICING", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("Standard or custom — your call", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text("Self-serve for most teams. Tailored for those with custom requirements.", {
        fontSize: 18,
        textAlign: "center",
        marginBottom: 56,
        maxWidth: "620px",
        marginLeft: "auto",
        marginRight: "auto",
      }),
    ]),
    row(
      [
        col(50, [
          el.card(
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 24,
              padding: 48,
            },
            [
              el.text("BUSINESS", {
                fontSize: 12,
                fontWeight: "700",
                color: theme.primary,
                letterSpacing: "0.14em",
                marginBottom: 16,
              }),
              el.heading("$99", {
                level: "h3",
                fontSize: 64,
                fontWeight: "800",
                letterSpacing: "-0.03em",
                lineHeight: "1",
                marginBottom: 6,
              }),
              el.text("per user / per month", {
                fontSize: 15,
                color: theme.textMuted,
                marginBottom: 24,
              }),
              el.text("Everything a growing trading team needs, priced per seat.", {
                fontSize: 16,
                marginBottom: 28,
              }),
              el.list(
                [
                  "Up to 25 users",
                  "All Pro features included",
                  "Shared strategy library",
                  "Role-based permissions",
                  "Audit logs & SSO",
                  "Priority email support",
                ],
                { marginBottom: 32 }
              ),
              el.button("Start 14-day trial", "/signup", {
                width: "100%",
                fontSize: 15,
                marginRight: 0,
              }),
            ]
          ),
        ]),
        col(50, [
          el.card(
            {
              backgroundColor: gradients.nightSky,
              borderWidth: 0,
              borderRadius: 24,
              padding: 48,
            },
            [
              el.text("ENTERPRISE", {
                fontSize: 12,
                fontWeight: "700",
                color: theme.primary,
                letterSpacing: "0.14em",
                marginBottom: 16,
              }),
              el.heading("Let's talk", {
                level: "h3",
                fontSize: 56,
                fontWeight: "800",
                letterSpacing: "-0.03em",
                lineHeight: "1.05",
                color: theme.onBand,
                marginBottom: 6,
              }),
              el.text("custom pricing, custom terms", {
                fontSize: 15,
                color: theme.onBandDim,
                marginBottom: 24,
              }),
              el.text(
                "For funds and institutional desks that need tailored infrastructure, compliance, and support.",
                {
                  fontSize: 16,
                  color: theme.onBandMuted,
                  marginBottom: 28,
                }
              ),
              el.list(
                [
                  "Unlimited users and volume",
                  "Dedicated nodes",
                  "Custom compliance reporting",
                  "Custom support SLA",
                  "Dedicated CSM and solutions architect",
                  "Invoice & custom payment terms",
                ],
                {
                  marginBottom: 32,
                  color: theme.onBandMuted,
                }
              ),
              el.button("Contact sales", "/contact", {
                width: "100%",
                fontSize: 15,
                marginRight: 0,
                backgroundColor: theme.onBandSurface,
                color: theme.onBandSurfaceInk,
              }),
            ]
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Enterprise Contact",
    description: "Standard pricing card paired with a dark Contact Sales card",
    category: "pricing",
    slug: "pricing-enterprise-contact",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
