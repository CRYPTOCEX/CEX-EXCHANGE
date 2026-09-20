import type { Section } from "@/types/builder";
import { el, row, col, section, theme } from "../../utils";

export const headerCryptoTicker: Section = section(
  [
    // Ticker strip.
    //
    // The two gain/loss hues below stay literal, ON PURPOSE. This strip is a
    // pinned dark band (`theme.bandInk`) sitting above a theme-following nav, so
    // its ink cannot fork with the theme — and `--destructive` DOES fork: its
    // LIGHT value measures 4.21:1 on bandInk, under the 4.5 floor for this 12px
    // copy, where the literal measures 5.05:1. `--success` would be safe
    // (5.61:1), but converting only the up-ticks would leave a token beside a
    // literal and invite exactly that regression later. Both want a pinned
    // accent pair the vocabulary does not have yet (onBandSuccess /
    // onBandDestructive).
    row(
      [
        col(100, [
          el.text(
            "BTC $67,842.19 <span style=\"color:#10b981\">+2.34%</span>  &nbsp;·&nbsp;  ETH $3,512.08 <span style=\"color:#10b981\">+1.87%</span>  &nbsp;·&nbsp;  SOL $178.44 <span style=\"color:#ef4444\">-0.62%</span>  &nbsp;·&nbsp;  BNB $612.30 <span style=\"color:#10b981\">+0.41%</span>  &nbsp;·&nbsp;  XRP $0.5821 <span style=\"color:#10b981\">+3.12%</span>",
            {
              fontSize: 12,
              fontWeight: "500",
              color: theme.onBand,
              marginBottom: 0,
              textAlign: "center",
              letterSpacing: "0.02em",
            }
          ),
        ]),
      ],
      {
        maxWidth: "100%",
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 24,
        paddingRight: 24,
        backgroundColor: theme.bandInk,
        verticalAlign: "middle",
      }
    ),
    // Main nav bar
    row(
      [
        col(25, [
          el.heading("Meridian", {
            level: "h1",
            fontSize: 22,
            fontWeight: "700",
            marginBottom: 0,
            letterSpacing: "-0.02em",
          }),
        ]),
        col(50, [
          el.link("Markets", "#markets", { marginRight: 28 }),
          el.link("Trade", "#trade", { marginRight: 28 }),
          el.link("Earn", "#earn", { marginRight: 28 }),
          el.link("Wallet", "#wallet", { marginRight: 28 }),
          el.link("Learn", "#learn", { marginRight: 0 }),
        ], { textAlign: "center" }),
        col(25, [
          el.link("Log in", "/login", {
            marginRight: 16,
            color: theme.textMuted,
          }),
          el.button("Get started", "/signup", {
            size: "md",
            fontSize: 14,
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 20,
            paddingRight: 20,
            marginRight: 0,
            marginTop: 0,
          }),
        ], { textAlign: "right" }),
      ],
      {
        paddingTop: 20,
        paddingBottom: 20,
        paddingLeft: 24,
        paddingRight: 24,
        verticalAlign: "middle",
        maxWidth: "1200px",
      }
    ),
  ],
  {
    name: "Crypto Ticker Header",
    description: "Ticker strip on top with BTC/ETH prices, followed by the full nav bar",
    category: "header",
    slug: "header-crypto-ticker",
    type: "fullwidth",
    settings: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      backgroundColor: theme.bgBase,
      borderBottom: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
    },
  }
);
