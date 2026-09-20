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

const faqItem = (question: string, answer: string) =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 26,
      marginBottom: 12,
    },
    [
      el.heading(question, {
        level: "h3",
        fontSize: 17,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 10,
        letterSpacing: "-0.01em",
      }),
      el.text(answer, {
        fontSize: 15,
        lineHeight: "1.65",
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const faqFeaturedWithSupport: Section = section(
  [
    singleColumnRow([
      el.heading("Need help? We've got you.", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "The four questions we answer most, plus a direct line to a human when your answer isn't listed.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(60, [
          faqItem(
            "How does leverage work?",
            "Leverage lets you control a larger position with less capital. We offer up to 20x with automatic liquidation guards."
          ),
          faqItem(
            "What's the minimum deposit?",
            "$10 to open. Pro features unlock at $1,000 in lifetime deposits."
          ),
          faqItem(
            "Can I withdraw to my bank account?",
            "Yes, via ACH, SEPA, or wire transfer. Most payouts land within 24 hours."
          ),
          faqItem(
            "Is my data encrypted?",
            "AES-256 at rest, TLS 1.3 in transit, HSM-backed keys rotated every 90 days."
          ),
        ]),
        col(
          40,
          [
            el.icon("lucide:life-buoy", {
              size: 44,
              color: theme.onBand,
              backgroundColor: theme.onBandBorder,
              borderRadius: 14,
              padding: 14,
              marginBottom: 24,
            }),
            el.heading("Still have questions?", {
              level: "h3",
              fontSize: 28,
              fontWeight: "800",
              color: theme.onBand,
              marginBottom: 14,
              letterSpacing: "-0.02em",
              lineHeight: "1.2",
            }),
            el.text(
              "Our support team is online 24/7 with a median first-response time of 2 minutes. Chat, email, or hop on a call.",
              {
                fontSize: 16,
                lineHeight: "1.65",
                color: theme.onBandMuted,
                marginBottom: 28,
              }
            ),
            el.button("Chat with support", "/support", {
              backgroundColor: theme.onBandSurface,
              color: theme.onBandSurfaceInk,
              width: "100%",
              marginRight: 0,
              marginTop: 0,
              marginBottom: 10,
              textAlign: "center",
            }),
            el.button("Email us", "mailto:support@example.com", {
              backgroundColor: theme.onBandFill,
              color: theme.onBand,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.onBandBorder,
              width: "100%",
              marginRight: 0,
              marginTop: 0,
              textAlign: "center",
            }),
          ],
          {
            backgroundColor: gradients.indigoViolet,
            borderRadius: 20,
            paddingTop: 40,
            paddingBottom: 40,
            paddingLeft: 36,
            paddingRight: 36,
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Featured with Support",
    description: "Four highlighted FAQs paired with a gradient Still have questions card",
    category: "faq",
    slug: "faq-featured-with-support",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
