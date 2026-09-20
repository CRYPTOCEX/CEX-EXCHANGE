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

const dividedItem = (question: string, answer: string) => [
  el.heading(question, {
    level: "h3",
    fontSize: 20,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 12,
    letterSpacing: "-0.01em",
    marginTop: 28,
  }),
  el.text(answer, {
    fontSize: 16,
    lineHeight: "1.75",
    color: theme.textMuted,
    marginBottom: 28,
  }),
  el.divider({ marginTop: 0, marginBottom: 0 }),
];

export const faqMinimalDivided: Section = section(
  [
    singleColumnRow(
      [
        el.heading("Questions & answers", {
          level: "h2",
          fontSize: 40,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 12,
          letterSpacing: "-0.03em",
          textAlign: "center",
        }),
        el.text(
          "Everything you need to know before you get started.",
          {
            fontSize: 17,
            textAlign: "center",
            color: theme.textMuted,
            marginBottom: 24,
            lineHeight: "1.6",
          }
        ),
        el.divider({ marginTop: 16, marginBottom: 0 }),
        ...dividedItem(
          "How does leverage work?",
          "You can trade up to 20x your capital on major pairs. Liquidation is automatic and happens before your margin is exhausted, so your downside is always bounded to your collateral."
        ),
        ...dividedItem(
          "What's the minimum deposit to start trading?",
          "Just $10. There are no monthly minimums, no maintenance fees, and no inactivity penalties — your account stays healthy as long as you own it."
        ),
        ...dividedItem(
          "Can I withdraw to my bank account?",
          "Yes. We support ACH, SEPA, Faster Payments, and international wires in 38 countries. Most payouts settle within one business day."
        ),
        ...dividedItem(
          "Is my data encrypted?",
          "Everything is encrypted at rest with AES-256 and in transit with TLS 1.3. Keys live in hardware security modules and rotate every 90 days."
        ),
        ...dividedItem(
          "How do fees work?",
          "Flat 0.10% maker, 0.20% taker on spot. Rebates begin at $100k monthly volume. Withdrawals to bank are always free; on-chain fees are passed through at cost."
        ),
        ...dividedItem(
          "Do you have an API?",
          "REST and WebSocket are included on every tier. Rate limits scale with your tier — from 60 req/min on Starter to unlimited on Pro."
        ),
        ...dividedItem(
          "How long does KYC take?",
          "Under 3 minutes for retail accounts. Institutional verification takes up to 24 hours and includes a call with a compliance specialist."
        ),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Minimal Divided FAQ",
    description: "Quiet vertical FAQ list with thin dividers between each pair",
    category: "faq",
    slug: "faq-minimal-divided",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
