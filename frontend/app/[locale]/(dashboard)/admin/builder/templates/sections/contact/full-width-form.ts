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

const formField = (label: string, placeholder: string) =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 0,
    },
    [
      el.text(label, {
        fontSize: 13,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 6,
        paddingTop: 14,
        paddingLeft: 18,
        paddingRight: 18,
      }),
      el.text(placeholder, {
        fontSize: 15,
        color: theme.textDim,
        marginBottom: 0,
        paddingLeft: 18,
        paddingRight: 18,
        paddingBottom: 16,
      }),
    ]
  );

const textAreaField = (label: string, placeholder: string) =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 0,
      minHeight: "140px",
    },
    [
      el.text(label, {
        fontSize: 13,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 6,
        paddingTop: 14,
        paddingLeft: 18,
        paddingRight: 18,
      }),
      el.text(placeholder, {
        fontSize: 15,
        color: theme.textDim,
        marginBottom: 0,
        paddingLeft: 18,
        paddingRight: 18,
        paddingBottom: 16,
        lineHeight: "1.6",
      }),
    ]
  );

export const contactFullWidthForm: Section = section(
  [
    singleColumnRow([
      el.text("CONTACT", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Tell us what you are working on", {
        textAlign: "center",
        fontSize: 48,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "The more context you can share, the faster the right person gets back to you.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(10, []),
        col(80, [
          el.card(
            {
              padding: 48,
              borderRadius: 28,
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              borderWidth: 1,
              boxShadowX: 0,
              boxShadowY: 24,
              boxShadowBlur: 56,
              boxShadowSpread: -16,
              boxShadowColor: "rgba(10,18,32,0.08)",
            },
            [
              row(
                [
                  col(50, [formField("First name", "Maya")]),
                  col(50, [formField("Last name", "Chen")]),
                ],
                { gutter: 18, paddingTop: 0, paddingBottom: 18, maxWidth: "100%" }
              ),
              row(
                [
                  col(50, [formField("Work email", "maya@yourdesk.com")]),
                  col(50, [formField("Company", "Meridian Capital")]),
                ],
                { gutter: 18, paddingTop: 0, paddingBottom: 18, maxWidth: "100%" }
              ),
              singleColumnRow(
                [
                  formField(
                    "Subject",
                    "Institutional onboarding — Asia derivatives book"
                  ),
                ],
                { paddingTop: 0, paddingBottom: 18, maxWidth: "100%" }
              ),
              singleColumnRow(
                [
                  textAreaField(
                    "Your message",
                    "We currently route through two venues and are looking for a third with strong Asia-hours liquidity. Average daily notional around $40M across futures and perpetuals…"
                  ),
                ],
                { paddingTop: 0, paddingBottom: 24, maxWidth: "100%" }
              ),
              el.button("Send message", "#send", {
                fontSize: 16,
                width: "100%",
                paddingTop: 16,
                paddingBottom: 16,
              }),
              el.text(
                "By submitting this form you agree to our privacy policy.",
                {
                  fontSize: 13,
                  textAlign: "center",
                  color: theme.textDim,
                  marginTop: 16,
                  marginBottom: 0,
                }
              ),
            ]
          ),
        ]),
        col(10, []),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
  ],
  {
    name: "Full-Width Form",
    description: "Wide-column contact form with premium styling",
    category: "contact",
    slug: "contact-full-width-form",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
