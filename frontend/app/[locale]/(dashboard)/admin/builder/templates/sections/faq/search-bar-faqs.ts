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

export const faqSearchBarFaqs: Section = section(
  [
    singleColumnRow([
      el.heading("How can we help?", {
        level: "h2",
        fontSize: 52,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
        lineHeight: "1.08",
      }),
      el.text(
        "Search over 400 help articles, or browse the most asked questions below.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 36,
          lineHeight: "1.6",
        }
      ),
      el.text("Search for answers, guides, or troubleshooting", {
        fontSize: 16,
        color: theme.textDim,
        backgroundColor: theme.bgCard,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border,
        borderRadius: 999,
        paddingTop: 18,
        paddingBottom: 18,
        paddingLeft: 28,
        paddingRight: 28,
        maxWidth: "640px",
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 56,
        boxShadowY: 2,
        boxShadowBlur: 20,
        boxShadowColor: "rgba(10,18,32,0.06)",
      }),
    ]),
    singleColumnRow(
      [
        faqItem(
          "How does leverage work?",
          "Leverage lets you control a larger position with a smaller amount of capital. We offer up to 20x with automated liquidation protection."
        ),
        faqItem(
          "What's the minimum deposit?",
          "$10 for retail accounts. Institutional accounts start at $50,000 and include a dedicated account manager."
        ),
        faqItem(
          "Can I withdraw to my bank account?",
          "Yes, via ACH, SEPA, or wire transfer. Most withdrawals land within 24 hours on business days."
        ),
        faqItem(
          "Is my data encrypted?",
          "All data is encrypted at rest with AES-256 and in transit with TLS 1.3. Keys are rotated every 90 days."
        ),
        faqItem(
          "How do I enable API trading?",
          "Head to Settings → Developers, generate a key pair, and choose your permission scopes. All keys are IP-restricted by default."
        ),
        faqItem(
          "What are your fees?",
          "Flat 0.1% maker / 0.2% taker for spot, with volume-based rebates starting at $100k monthly turnover."
        ),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Search Bar FAQs",
    description: "Help-center style hero with a prominent search and popular FAQs below",
    category: "faq",
    slug: "faq-search-bar-faqs",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
