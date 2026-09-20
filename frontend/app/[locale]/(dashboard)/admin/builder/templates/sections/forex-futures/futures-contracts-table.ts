import type { Section, Row } from "@/types/builder";
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

const contractRow = (
  symbol: string,
  type: string,
  markPrice: string,
  fundingRate: string,
  openInterest: string,
  volume24h: string,
  positive: boolean
): Row =>
  row(
    [
      col(20, [
        el.text(symbol, {
          fontSize: 15,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 2,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
        el.text(type, {
          fontSize: 11,
          fontWeight: "600",
          color: theme.textDim,
          letterSpacing: "0.08em",
          marginBottom: 0,
        }),
      ]),
      col(20, [
        el.text(markPrice, {
          fontSize: 15,
          color: theme.text,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(20, [
        el.text(fundingRate, {
          fontSize: 14,
          color: positive ? theme.emerald : theme.rose,
          fontWeight: "600",
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(20, [
        el.text(openInterest, {
          fontSize: 14,
          color: theme.textMuted,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(20, [
        el.text(volume24h, {
          fontSize: 14,
          color: theme.textMuted,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
    ],
    {
      ...rowPresets.wide,
      gutter: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "middle",
    }
  );

export const forexFuturesFuturesContractsTable: Section = section(
  [
    singleColumnRow([
      el.text("PERPETUALS & FUTURES", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Futures contracts, ranked by volume", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Cross-margin perpetuals with up to 125x leverage, plus dated quarterly futures for delta hedging.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 48,
        }
      ),
    ]),
    // Header
    row(
      [
        col(20, [
          el.text("SYMBOL", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            marginBottom: 0,
          }),
        ]),
        col(20, [
          el.text("MARK PRICE", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
        col(20, [
          el.text("FUNDING (8H)", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
        col(20, [
          el.text("OPEN INTEREST", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
        col(20, [
          el.text("24H VOLUME", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
      ],
      {
        ...rowPresets.wide,
        gutter: 16,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: theme.bgMuted,
        borderRadius: 12,
        verticalAlign: "middle",
      }
    ),
    contractRow("BTC-PERP", "Perpetual · 125x", "67,284.50", "+0.0082%", "$4.82B", "$18.4B", true),
    contractRow("ETH-PERP", "Perpetual · 100x", "3,512.80", "+0.0064%", "$2.14B", "$9.26B", true),
    contractRow("SOL-PERP", "Perpetual · 50x", "184.12", "-0.0018%", "$684M", "$2.12B", false),
    contractRow("XRP-PERP", "Perpetual · 50x", "0.5218", "+0.0042%", "$312M", "$948M", true),
    contractRow("BTC-0628", "Quarterly", "67,482.00", "—", "$1.12B", "$642M", true),
    contractRow("ETH-0628", "Quarterly", "3,528.40", "—", "$514M", "$284M", true),
    contractRow("DOGE-PERP", "Perpetual · 25x", "0.1684", "+0.0124%", "$184M", "$628M", true),
  ],
  {
    name: "Futures Contracts Table",
    description: "Table of futures contract mark prices, funding rates, and open interest",
    category: "forex-futures",
    slug: "forex-futures-futures-contracts-table",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
