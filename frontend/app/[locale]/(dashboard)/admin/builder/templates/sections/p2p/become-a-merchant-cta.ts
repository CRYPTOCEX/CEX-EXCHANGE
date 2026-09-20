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

const benefit = (icon: string, title: string, body: string) =>
  col(100, [
    el.icon(icon, {
      size: 24,
      color: theme.onBand,
      marginBottom: 12,
    }),
    el.heading(title, {
      level: "h4",
      fontSize: 17,
      fontWeight: "700",
      color: theme.onBand,
      marginBottom: 8,
    }),
    el.text(body, {
      fontSize: 14,
      color: theme.onBandDim,
      lineHeight: "1.6",
      marginBottom: 0,
    }),
  ]);

export const p2pBecomeAMerchantCta: Section = section(
  [
    singleColumnRow([
      el.text("APPLY TO BECOME A MERCHANT", {
        fontSize: 12,
        fontWeight: "700",
        // Pinned band ink. `theme.emerald` would be wrong here: on this
        // gradient's middle stop the LIGHT `--success` measures 2.87:1, and the
        // ground does not fork with the theme to compensate.
        color: theme.onBand,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Turn your liquidity into a business", {
        level: "h2",
        fontSize: 52,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        marginBottom: 20,
        maxWidth: "840px",
      }),
      el.text(
        "Verified merchants set their own prices, access premium APIs, and earn up to $250,000 per month. The top 100 merchants cleared $24M in March alone.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "720px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        benefit("lucide:percent", "Zero trading fees", "Merchants pay 0% on both taker and maker volume, for life."),
        benefit("lucide:api", "Merchant API", "Automate pricing with a private REST + WebSocket feed."),
        benefit("lucide:shield-check", "Priority escrow", "Instant dispute review. Dedicated specialist per merchant."),
        benefit("lucide:trending-up", "Promoted listings", "Appear above retail offers. Higher order-fill rate."),
      ],
      { ...rowPresets.wide, gutter: 28, marginBottom: 48, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.button("Apply now", "/p2p/apply", {
          // The bright-chip-on-a-dark-band pairing. `bandSuccess` would keep the
          // green but at #086043 it is within a hair of this gradient's own
          // middle stop (#064e3b), so the button would vanish into the band.
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          fontSize: 16,
          paddingLeft: 36,
          paddingRight: 36,
          marginRight: 12,
        }),
        el.button("Read requirements", "/p2p/merchant-requirements", {
          backgroundColor: theme.onBandFill,
          color: theme.onBand,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.onBandBorder,
          fontSize: 16,
          paddingLeft: 28,
          paddingRight: 28,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Become a Merchant CTA",
    description: "Dark gradient CTA pitching the merchant program with 4 benefits",
    category: "p2p",
    slug: "p2p-become-a-merchant-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#022c22",
          via: "#064e3b",
          to: "#0f172a",
          light: { direction: "to-br", from: "#022c22", via: "#064e3b", to: "#0f172a" },
          dark: { direction: "to-br", from: "#020617", via: "#064e3b", to: "#042f2e" },
        },
      } as any,
    },
  }
);
