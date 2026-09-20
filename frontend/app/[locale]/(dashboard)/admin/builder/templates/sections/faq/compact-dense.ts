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

const compactQa = (question: string, answer: string) => [
  el.heading(question, {
    level: "h3",
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 6,
    letterSpacing: "-0.005em",
  }),
  el.text(answer, {
    fontSize: 14,
    lineHeight: "1.6",
    color: theme.textMuted,
    marginBottom: 20,
  }),
];

export const faqCompactDense: Section = section(
  [
    singleColumnRow([
      el.heading("The fast FAQ", {
        level: "h2",
        fontSize: 38,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 12,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "Short answers only. For anything longer, head to our docs or ping support.",
        {
          fontSize: 16,
          textAlign: "center",
          color: theme.textMuted,
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(50, [
          ...compactQa(
            "How does leverage work?",
            "Up to 20x on majors, 5x on altcoins, with auto-liquidation guards."
          ),
          ...compactQa(
            "What's the minimum deposit?",
            "$10 for retail, $50k for institutional accounts."
          ),
          ...compactQa(
            "Can I withdraw to my bank?",
            "Yes — ACH, SEPA, and wires supported in 38 countries."
          ),
          ...compactQa(
            "Is my data encrypted?",
            "AES-256 at rest, TLS 1.3 in transit, HSM-backed keys."
          ),
          ...compactQa(
            "What are the fees?",
            "0.10% maker / 0.20% taker, with rebates from $100k volume."
          ),
          ...compactQa(
            "Do you offer an API?",
            "Yes — REST and WebSocket, included on every tier."
          ),
        ]),
        col(50, [
          ...compactQa(
            "How fast is verification?",
            "Under 3 minutes for retail, 24 hours for institutional."
          ),
          ...compactQa(
            "Which assets can I trade?",
            "450+ spot pairs, 120 perps, forex, commodities, tokenized stocks."
          ),
          ...compactQa(
            "Is there a mobile app?",
            "iOS and Android, with full parity to the desktop experience."
          ),
          ...compactQa(
            "How do I enable 2FA?",
            "Settings → Security. We strongly recommend hardware keys."
          ),
          ...compactQa(
            "Do you pay referral rewards?",
            "Yes — 25% of the taker fees from every user you refer, forever."
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 48, verticalAlign: "top" }
    ),
  ],
  {
    name: "Compact Dense FAQ",
    description: "Tight 2-column layout packing 11 quick-hit questions and answers",
    category: "faq",
    slug: "faq-compact-dense",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
