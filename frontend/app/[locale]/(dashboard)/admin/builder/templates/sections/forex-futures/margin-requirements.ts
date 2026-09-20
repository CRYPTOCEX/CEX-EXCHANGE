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

const marginRow = (
  asset: string,
  symbol: string,
  tier: string,
  initialMargin: string,
  maintMargin: string,
  maxLeverage: string
): Row =>
  row(
    [
      col(28, [
        el.text(asset, {
          fontSize: 15,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 2,
        }),
        el.text(symbol, {
          fontSize: 12,
          color: theme.textDim,
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(18, [
        el.text(tier, {
          fontSize: 13,
          color: theme.textMuted,
          textAlign: "center",
          marginBottom: 0,
        }),
      ], { textAlign: "center" }),
      col(18, [
        el.text(initialMargin, {
          fontSize: 15,
          fontWeight: "600",
          color: theme.text,
          textAlign: "center",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ], { textAlign: "center" }),
      col(18, [
        el.text(maintMargin, {
          fontSize: 15,
          fontWeight: "600",
          color: theme.amber,
          textAlign: "center",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ], { textAlign: "center" }),
      col(18, [
        el.text(maxLeverage, {
          fontSize: 15,
          fontWeight: "700",
          color: theme.primary,
          textAlign: "center",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ], { textAlign: "center" }),
    ],
    {
      ...rowPresets.contained,
      gutter: 16,
      paddingTop: 18,
      paddingBottom: 18,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "middle",
    }
  );

export const forexFuturesMarginRequirements: Section = section(
  [
    singleColumnRow([
      el.text("MARGIN SCHEDULE", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Margin requirements by asset", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Initial and maintenance margin scale with position size. Tiered schedule keeps maker incentives strong.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "660px",
          marginBottom: 48,
        }
      ),
    ]),
    // Header
    row(
      [
        col(28, [
          el.text("ASSET", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            marginBottom: 0,
          }),
        ]),
        col(18, [
          el.text("TIER", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(18, [
          el.text("INITIAL", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(18, [
          el.text("MAINTENANCE", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(18, [
          el.text("MAX LEVERAGE", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
      ],
      {
        ...rowPresets.contained,
        gutter: 16,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: theme.bgMuted,
        borderRadius: 12,
        verticalAlign: "middle",
      }
    ),
    marginRow("Bitcoin", "BTC-PERP", "< $500K", "0.80%", "0.40%", "125x"),
    marginRow("Ethereum", "ETH-PERP", "< $500K", "1.00%", "0.50%", "100x"),
    marginRow("Solana", "SOL-PERP", "< $250K", "2.00%", "1.00%", "50x"),
    marginRow("XRP", "XRP-PERP", "< $250K", "2.00%", "1.00%", "50x"),
    marginRow("BNB", "BNB-PERP", "< $250K", "2.50%", "1.25%", "40x"),
    marginRow("Cardano", "ADA-PERP", "< $100K", "4.00%", "2.00%", "25x"),
    marginRow("Dogecoin", "DOGE-PERP", "< $100K", "4.00%", "2.00%", "25x"),
    singleColumnRow(
      [
        el.text(
          "Higher position tiers use progressively stricter margin requirements. View the full 6-tier schedule in our documentation.",
          {
            fontSize: 13,
            color: theme.textDim,
            textAlign: "center",
            marginTop: 32,
            marginBottom: 16,
          }
        ),
        el.link("View full margin schedule →", "/docs/margin", {
          fontSize: 14,
          fontWeight: "600",
        }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Margin Requirements",
    description: "Asset-by-asset margin schedule with initial, maintenance, and max leverage",
    category: "forex-futures",
    slug: "forex-futures-margin-requirements",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
