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

const faqItem = (question: string, answer = "", defaultOpen = false) =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 28,
      marginBottom: 12,
      maxWidth: "760px",
      marginLeft: "auto",
      marginRight: "auto",
    },
    [
      el.heading(question, {
        level: "h3",
        fontSize: 17,
        fontWeight: "600",
        color: theme.text,
        marginBottom: defaultOpen ? 12 : 0,
        letterSpacing: "-0.01em",
      }),
      ...(defaultOpen && answer
        ? [
            el.text(answer, {
              fontSize: 15,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]
        : []),
    ]
  );

export const faqAccordionClassic: Section = section(
  [
    singleColumnRow([
      el.text("FAQ", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("Frequently asked questions", {
        level: "h2",
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 18,
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
      }),
      el.text(
        "Answers to the questions we hear most. Can't find what you need? Our support team replies in under 2 hours.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    singleColumnRow(
      [
        faqItem(
          "How does leverage work on Meridian?",
          "Leverage multiplies your buying power by borrowing capital against your collateral. We offer up to 20x on majors and 5x on altcoins, with automatic liquidation guards that settle positions before your margin is exhausted.",
          true
        ),
        faqItem("What's the minimum deposit to get started?"),
        faqItem("Can I withdraw to my bank account?"),
        faqItem("Is my data and capital encrypted at rest?"),
        faqItem("Which regions and currencies are supported?"),
        faqItem("How long does identity verification take?"),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Accordion Classic",
    description: "Centered FAQ stack with chevron indicators on bordered cards",
    category: "faq",
    slug: "faq-accordion-classic",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
