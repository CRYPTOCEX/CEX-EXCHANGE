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

const numberedItem = (n: string, question: string, answer: string) =>
  row(
    [
      col(10, [
        el.heading(n, {
          level: "h3",
          fontSize: 32,
          fontWeight: "800",
          color: theme.primary,
          marginBottom: 0,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }),
      ]),
      col(90, [
        el.heading(question, {
          level: "h3",
          fontSize: 22,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }),
        el.text(answer, {
          fontSize: 16,
          lineHeight: "1.7",
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
    ],
    {
      ...rowPresets.narrow,
      gutter: 24,
      paddingTop: 28,
      paddingBottom: 28,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "top",
    }
  );

export const faqNumberedList: Section = section(
  [
    singleColumnRow([
      el.text("THE FUNDAMENTALS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("Common questions, in order", {
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
        "A numbered walk-through of what new traders ask us first — from your first deposit to your first profitable trade.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 40,
          lineHeight: "1.6",
        }
      ),
    ]),
    numberedItem(
      "01",
      "How does leverage work?",
      "Leverage borrows capital against your collateral so a smaller margin controls a larger position. We offer up to 20x on majors, with liquidation guards that close positions before your margin hits zero."
    ),
    numberedItem(
      "02",
      "What's the minimum deposit?",
      "You can open an account and start trading with $10. Pro features unlock at $1,000 in lifetime deposits; institutional tooling begins at $50,000."
    ),
    numberedItem(
      "03",
      "Can I withdraw to my bank account?",
      "Yes. ACH in the US, SEPA in the EU, Faster Payments in the UK, and wires globally. Most transfers settle within one business day."
    ),
    numberedItem(
      "04",
      "Is my data encrypted?",
      "Every byte is encrypted at rest with AES-256 and in transit with TLS 1.3. Private keys live in hardware security modules and rotate every 90 days."
    ),
    numberedItem(
      "05",
      "What are the trading fees?",
      "0.10% maker, 0.20% taker on spot. Volume rebates kick in at $100k monthly turnover. Withdrawals to bank are free; on-chain fees are passed through at cost."
    ),
    numberedItem(
      "06",
      "How fast can I get verified?",
      "Retail KYC completes in under 3 minutes for most users. Enhanced verification for institutional accounts finishes within 24 hours."
    ),
  ],
  {
    name: "Numbered FAQ List",
    description: "Vertical list with 01, 02, 03 numbering and large divided rows",
    category: "faq",
    slug: "faq-numbered-list",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
