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

type Payout = {
  currency: string;
  frequency: string;
  minimum: string;
  fee: string;
  processing: string;
  recommended?: boolean;
};

const payouts: Payout[] = [
  { currency: "USDT (TRC-20)", frequency: "Weekly", minimum: "$50", fee: "Free", processing: "Same day", recommended: true },
  { currency: "USDC (ERC-20)", frequency: "Weekly", minimum: "$50", fee: "Network fee", processing: "Same day" },
  { currency: "BTC", frequency: "Monthly", minimum: "$100", fee: "Network fee", processing: "1-2 business days" },
  { currency: "ETH", frequency: "Monthly", minimum: "$100", fee: "Network fee", processing: "1-2 business days" },
  { currency: "USD (SWIFT wire)", frequency: "Monthly", minimum: "$500", fee: "$25 flat", processing: "3-5 business days" },
];

const payoutRow = (p: Payout) =>
  row(
    [
      col(28, [
        el.heading(p.currency, {
          level: "h4",
          fontSize: 15,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 4,
        }),
        ...(p.recommended
          ? [
              el.text("RECOMMENDED", {
                fontSize: 10,
                fontWeight: "800",
                color: theme.emerald,
                letterSpacing: "0.15em",
                marginBottom: 0,
              }),
            ]
          : []),
      ]),
      col(18, [el.text(p.frequency, { fontSize: 14, color: theme.text, fontWeight: "500", marginBottom: 0 })]),
      col(18, [el.text(p.minimum, { fontSize: 14, color: theme.textMuted, marginBottom: 0 })]),
      col(18, [el.text(p.fee, { fontSize: 14, color: p.fee === "Free" ? theme.emerald : theme.textMuted, fontWeight: p.fee === "Free" ? "600" : "400", marginBottom: 0 })]),
      col(18, [el.text(p.processing, { fontSize: 14, color: theme.textMuted, marginBottom: 0 })]),
    ],
    {
      ...rowPresets.wide,
      maxWidth: "1040px",
      gutter: 12,
      paddingTop: 18,
      paddingBottom: 18,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "middle",
    }
  );

export const affiliatePayoutsSchedule: Section = section(
  [
    singleColumnRow([
      el.text("PAYOUTS", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.emerald,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Get paid, your way", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Five payout options, no hidden fees. Switch between them anytime from your dashboard.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(28, [el.text("Currency", { fontSize: 11, fontWeight: "800", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(18, [el.text("Frequency", { fontSize: 11, fontWeight: "800", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(18, [el.text("Minimum", { fontSize: 11, fontWeight: "800", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(18, [el.text("Fees", { fontSize: 11, fontWeight: "800", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(18, [el.text("Processing", { fontSize: 11, fontWeight: "800", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
      ],
      {
        ...rowPresets.wide,
        maxWidth: "1040px",
        gutter: 12,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: theme.bgMuted,
        borderRadius: 12,
        verticalAlign: "middle",
        marginBottom: 4,
      }
    ),
    ...payouts.map(payoutRow),
  ],
  {
    name: "Payouts Schedule",
    description: "Payout schedule table with currencies, frequencies, minimums, fees",
    category: "affiliate",
    slug: "affiliate-payouts-schedule",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
