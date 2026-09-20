import type { Section, Element } from "@/types/builder";
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

const poolCard = (
  icon: string,
  name: string,
  ticker: string,
  apy: string,
  tvl: string,
  lock: string
): Element[] => [
  el.icon(icon, { size: 40, color: theme.emerald, marginBottom: 16 }),
  el.text(name, {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 2,
  }),
  el.text(ticker, {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 24,
  }),
  el.heading(apy, {
    level: "h3",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: "-0.025em",
    color: theme.emerald,
    marginBottom: 6,
  }),
  el.text("Variable APY", {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.14em",
    color: theme.textMuted,
    marginBottom: 20,
  }),
  el.divider({ marginTop: 0, marginBottom: 16, borderColor: theme.border }),
  el.text(
    `<span style="display:inline-block;width:50%"><span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.14em;opacity:0.7;margin-bottom:4px">TVL</span><span style="display:block;font-size:14px;font-weight:700">${tvl}</span></span><span style="display:inline-block;width:50%"><span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.14em;opacity:0.7;margin-bottom:4px">LOCK</span><span style="display:block;font-size:14px;font-weight:700">${lock}</span></span>`,
    {
      fontSize: 14,
      color: theme.text,
      marginBottom: 24,
    }
  ),
  el.button("Stake", `/staking/${ticker.toLowerCase()}`, {
    backgroundColor: theme.cssSuccess,
    fontSize: 14,
    width: "100%",
    textAlign: "center",
    marginTop: 0,
    marginRight: 0,
  }),
];

const poolCardSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 28,
};

export const stakingTopPoolsGrid: Section = section(
  [
    singleColumnRow([
      el.text("LIVE POOLS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.emerald,
        marginBottom: 12,
      }),
      el.heading("Six highest-yielding pools", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Ranked by APY across the pools you list.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33, poolCard("cryptocurrency-color:eth", "Ethereum Liquid", "ETH", "5.20%", "$318.2M", "Flexible"), poolCardSettings),
        col(33, poolCard("cryptocurrency-color:sol", "Solana Delegated", "SOL", "6.80%", "$94.8M", "14-day"), poolCardSettings),
        col(34, poolCard("cryptocurrency-color:usdt", "USDT Yield", "USDT", "8.10%", "$204.1M", "Flexible"), poolCardSettings),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24, verticalAlign: "top" }
    ),
    row(
      [
        col(33, poolCard("cryptocurrency-color:dot", "Polkadot Nominator", "DOT", "10.40%", "$48.2M", "28-day"), poolCardSettings),
        col(33, poolCard("cryptocurrency-color:atom", "Cosmos Hub", "ATOM", "11.80%", "$36.1M", "21-day"), poolCardSettings),
        col(34, poolCard("cryptocurrency-color:ada", "Cardano Delegated", "ADA", "4.60%", "$72.4M", "Flexible"), poolCardSettings),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Top Pools Grid",
    description: "Six highest-yielding staking pools with APY, TVL, and lock",
    category: "staking",
    slug: "staking-top-pools-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
