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

const qa = (question: string, answer: string) => [
  el.heading(question, {
    level: "h3",
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 10,
    letterSpacing: "-0.01em",
  }),
  el.text(answer, {
    fontSize: 15,
    lineHeight: "1.7",
    color: theme.textMuted,
    marginBottom: 32,
  }),
];

export const faqTwoColumnGrid: Section = section(
  [
    singleColumnRow([
      el.heading("Your questions, answered", {
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
        "Everything we get asked most — organized so you can skim and find what you need fast.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "580px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(50, [
          ...qa(
            "How does leverage work?",
            "You can trade up to 20x your capital. We calculate your effective position size in real time and auto-reduce exposure before liquidation."
          ),
          ...qa(
            "Can I withdraw to my bank account?",
            "Yes. ACH, SEPA, and wire transfers are supported in 38 countries. Most withdrawals settle within one business day."
          ),
          ...qa(
            "Is my data encrypted?",
            "All data is encrypted at rest with AES-256 and in transit with TLS 1.3. Keys are rotated every 90 days and stored in hardware modules."
          ),
          ...qa(
            "Do you charge inactivity fees?",
            "Never. Your account stays active and fee-free for as long as you keep it open, whether you trade daily or once a quarter."
          ),
        ]),
        col(50, [
          ...qa(
            "What's the minimum deposit?",
            "$10 to open an account. Pro tier features unlock at $1,000 in cumulative deposits, but all core trading tools are available from day one."
          ),
          ...qa(
            "How long does verification take?",
            "Identity checks typically complete in under 3 minutes. Enhanced verification for institutional accounts takes up to 24 hours."
          ),
          ...qa(
            "Which assets can I trade?",
            "Over 450 spot pairs and 120 perpetual futures across crypto, commodities, forex, and tokenized equities. New listings every Wednesday."
          ),
          ...qa(
            "Do you support API access?",
            "REST and WebSocket APIs are included on every tier. Rate limits scale with your tier — from 60 req/min on Starter to unlimited on Pro."
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 56 }
    ),
  ],
  {
    name: "Two-Column FAQ Grid",
    description: "Clean 2-column FAQ layout with 8 question and answer pairs",
    category: "faq",
    slug: "faq-two-column-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
