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

const faqCard = (
  icon: string,
  question: string,
  answer: string,
  accent: string = theme.primary
) =>
  col(
    33.33,
    [
      el.icon(icon, {
        size: 28,
        color: accent,
        backgroundColor: theme.primarySoft,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
      }),
      el.heading(question, {
        level: "h3",
        fontSize: 18,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 10,
        letterSpacing: "-0.01em",
      }),
      el.text(answer, {
        fontSize: 14,
        lineHeight: "1.65",
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingTop: 28,
      paddingBottom: 28,
      paddingLeft: 28,
      paddingRight: 28,
    }
  );

export const faqCardGrid: Section = section(
  [
    singleColumnRow([
      el.text("QUICK ANSWERS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("Five things worth knowing", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
      }),
      el.text(
        "Short, card-sized answers for the topics that come up most — from leverage to encryption to getting paid out.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "580px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        faqCard(
          "lucide:trending-up",
          "How does leverage work?",
          "Leverage multiplies buying power by borrowing against your collateral. We offer up to 20x with auto-liquidation guards.",
          theme.primary
        ),
        faqCard(
          "lucide:wallet",
          "What's the minimum deposit?",
          "$10 to open. No monthly minimums and no inactivity fees, ever.",
          theme.emerald
        ),
        faqCard(
          "lucide:landmark",
          "Can I withdraw to my bank?",
          "Yes — ACH, SEPA, and wire transfers in 38 countries. Most payouts land within 24 hours.",
          theme.sky
        ),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24 }
    ),
    row(
      [
        faqCard(
          "lucide:lock",
          "Is my data encrypted?",
          "AES-256 at rest, TLS 1.3 in transit, HSM-backed keys rotated every 90 days.",
          theme.violet
        ),
        faqCard(
          "lucide:receipt",
          "What are your fees?",
          "0.10% maker / 0.20% taker, with volume rebates starting at $100k turnover.",
          theme.amber
        ),
      ],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "Card Grid FAQ",
    description: "Five FAQ cards in a 3-column grid with accent icons",
    category: "faq",
    slug: "faq-card-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
