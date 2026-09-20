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

const assetRow = (
  icon: string,
  ticker: string,
  name: string,
  apy: string,
  tvl: string,
  lock: string
): Row =>
  row(
    [
      col(8, [
        el.icon(icon, {
          size: 36,
          color: theme.emerald,
          marginBottom: 0,
        }),
      ]),
      col(22, [
        el.text(ticker, {
          fontSize: 16,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 2,
        }),
        el.text(name, {
          fontSize: 12,
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(20, [
        el.text(apy, {
          fontSize: 22,
          fontWeight: "800",
          color: theme.emerald,
          marginBottom: 2,
          letterSpacing: "-0.02em",
        }),
        el.text("APY", {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: "0.14em",
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(20, [
        el.text(tvl, {
          fontSize: 15,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 2,
        }),
        el.text("TVL", {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: "0.14em",
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(15, [
        el.text(lock, {
          fontSize: 14,
          fontWeight: "600",
          color: theme.text,
          marginBottom: 2,
        }),
        el.text("LOCK", {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: "0.14em",
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(15, [
        el.button("Stake", `/staking/${ticker.toLowerCase()}`, {
          fontSize: 13,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 20,
          paddingRight: 20,
          marginTop: 0,
          marginRight: 0,
          backgroundColor: theme.cssSuccess,
        }),
      ]),
    ],
    {
      gutter: 12,
      verticalAlign: "middle",
      maxWidth: "1080px",
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 28,
      paddingRight: 28,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
      borderRadius: 16,
      marginBottom: 12,
    }
  );

export const stakingApyTableHero: Section = section(
  [
    singleColumnRow([
      el.text("EARN ON IDLE ASSETS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.emerald,
        marginBottom: 12,
      }),
      el.heading("Live staking APY", {
        textAlign: "center",
        fontSize: 52,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Variable-rate yield on the four most-staked assets. Rates update every epoch.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
        }
      ),
    ]),
    assetRow("cryptocurrency-color:btc", "BTC", "Bitcoin", "4.50%", "$412.6M", "Flexible"),
    assetRow("cryptocurrency-color:eth", "ETH", "Ethereum", "5.20%", "$318.2M", "7-day"),
    assetRow("cryptocurrency-color:sol", "SOL", "Solana", "6.80%", "$94.8M", "14-day"),
    assetRow("cryptocurrency-color:usdt", "USDT", "Tether", "8.10%", "$204.1M", "Flexible"),
  ],
  {
    name: "APY Table Hero",
    description: "Four-asset staking APY table with stake CTAs",
    category: "staking",
    slug: "staking-apy-table-hero",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: theme.bgBase,
    },
  }
);
