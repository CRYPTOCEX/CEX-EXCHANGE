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

const filterChip = (label: string, active = false) =>
  col(
    100,
    [
      el.text(label, {
        fontSize: 13,
        fontWeight: "600",
        /* Active chip is the bright-surface-on-a-dark-band pairing (17.4:1).
           Inactive chips use full `onBand` rather than `onBandMuted`: this row
           sits at the far end of a `to-br` gradient, over the lightest stop
           (`#065f46`), where `onBandMuted` on `onBandFill` measures 4.47:1 —
           just under the floor. `onBand` there is 5.76:1. The active/inactive
           distinction is carried by the pill fill, not the ink. */
        color: active
          ? theme.onBandSurfaceInk
          : theme.onBand,
        marginBottom: 0,
        textAlign: "center",
      }),
    ],
    {
      backgroundColor: active
        ? theme.onBandSurface
        : theme.onBandFill,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: active
        ? theme.onBandSurface
        : theme.onBandFill,
      borderRadius: 999,
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 18,
      paddingRight: 18,
    }
  );

export const p2pMarketplaceHero: Section = section(
  [
    singleColumnRow([
      el.text("PEER-TO-PEER MARKETPLACE", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBandMuted,
        letterSpacing: "0.22em",
        marginBottom: 20,
      }),
      el.heading("Buy & sell crypto directly with 2M+ traders", {
        level: "h1",
        fontSize: 68,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.035em",
        lineHeight: "1.05",
        marginBottom: 22,
        maxWidth: "920px",
      }),
      el.text(
        "Zero-fee P2P trading across 190+ countries. 100+ payment methods, escrow-protected, settled in minutes.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "700px",
          marginBottom: 40,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(
          30,
          [
            el.text("I want to", {
              fontSize: 11,
              fontWeight: "700",
              color: theme.onBandDim,
              letterSpacing: "0.15em",
              marginBottom: 8,
            }),
            el.text("Buy USDT", {
              fontSize: 18,
              fontWeight: "700",
              color: theme.onBand,
              marginBottom: 0,
            }),
          ],
          {
            backgroundColor: theme.onBandFill,
            borderRadius: 12,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 18,
            paddingRight: 18,
          }
        ),
        col(
          30,
          [
            el.text("With", {
              fontSize: 11,
              fontWeight: "700",
              color: theme.onBandDim,
              letterSpacing: "0.15em",
              marginBottom: 8,
            }),
            el.text("USD · Bank transfer", {
              fontSize: 18,
              fontWeight: "700",
              color: theme.onBand,
              marginBottom: 0,
            }),
          ],
          {
            backgroundColor: theme.onBandFill,
            borderRadius: 12,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 18,
            paddingRight: 18,
          }
        ),
        col(
          20,
          [
            el.text("Amount", {
              fontSize: 11,
              fontWeight: "700",
              color: theme.onBandDim,
              letterSpacing: "0.15em",
              marginBottom: 8,
            }),
            el.text("$2,500", {
              fontSize: 18,
              fontWeight: "700",
              color: theme.onBand,
              marginBottom: 0,
            }),
          ],
          {
            backgroundColor: theme.onBandFill,
            borderRadius: 12,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 18,
            paddingRight: 18,
          }
        ),
        col(
          20,
          [
            el.button("Find offers", "/p2p/offers", {
              backgroundColor: theme.onBandSurface,
              color: theme.onBandSurfaceInk,
              fontSize: 15,
              width: "100%",
              marginTop: 0,
              marginRight: 0,
              paddingTop: 16,
              paddingBottom: 16,
              textAlign: "center",
            }),
          ],
          { paddingLeft: 6, paddingRight: 0 }
        ),
      ],
      {
        ...rowPresets.narrow,
        maxWidth: "880px",
        gutter: 12,
        // Scrim panel on the pinned gradient band — `overlay` is `bandInk` at
        // 60%, which is what this rgba was hand-rolling.
        backgroundColor: theme.overlay,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.onBandFill,
        borderRadius: 20,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 14,
        paddingRight: 14,
        verticalAlign: "middle",
      }
    ),
    row(
      [
        filterChip("All methods", true),
        filterChip("Bank transfer"),
        filterChip("Wise"),
        filterChip("Revolut"),
        filterChip("PayPal"),
        filterChip("Cash App"),
        filterChip("SEPA"),
      ],
      {
        ...rowPresets.narrow,
        maxWidth: "880px",
        gutter: 8,
        marginTop: 20,
        verticalAlign: "middle",
      }
    ),
  ],
  {
    name: "Marketplace Hero",
    description: "P2P marketplace hero with inline search, currency + payment filter chips",
    category: "p2p",
    slug: "p2p-marketplace-hero",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#020617",
          via: "#052e1f",
          to: "#064e3b",
          light: { direction: "to-br", from: "#0f172a", via: "#064e3b", to: "#065f46" },
          dark: { direction: "to-br", from: "#020617", via: "#042f2e", to: "#064e3b" },
        },
      } as any,
    },
  }
);
