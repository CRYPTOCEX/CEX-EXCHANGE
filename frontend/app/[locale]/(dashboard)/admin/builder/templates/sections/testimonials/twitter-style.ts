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
import type { Element } from "@/types/builder";

const tweetCard = (
  name: string,
  handle: string,
  timestamp: string,
  body: string,
  avatarSrc: string,
  alt: string,
): Element =>
  el.card(
    {
      padding: 24,
      borderRadius: 16,
      marginBottom: 24,
    },
    [
      el.image(avatarSrc, alt, {
        width: "44px",
        height: "44px",
        borderRadius: 999,
        marginBottom: 12,
      }),
      el.text(name, {
        fontSize: 15,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 2,
      }),
      el.text(`${handle} · ${timestamp}`, {
        fontSize: 13,
        color: theme.textDim,
        marginBottom: 14,
      }),
      el.text(body, {
        fontSize: 16,
        lineHeight: "1.55",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text("♡  24    ↻  6    ↗", {
        fontSize: 13,
        color: theme.textDim,
        marginBottom: 0,
      }),
    ]
  );

export const testimonialsTwitterStyle: Section = section(
  [
    singleColumnRow([
      el.text("FROM THE COMMUNITY", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("What traders are posting", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 48,
      }),
    ]),
    row(
      [
        col(33.33, [
          tweetCard(
            "Ava Chen",
            "@avatrades",
            "2h",
            "Order router on the new platform is shaving basis points off every fill. I've watched two opens — the difference is real.",
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
            "Avatar of Ava Chen",
          ),
          tweetCard(
            "Ravi Mehta",
            "@ravimehta_fx",
            "1d",
            "Finally, a backtester that doesn't silently drop bars on gap days. Night and day vs. what we had.",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
            "Avatar of Ravi Mehta",
          ),
        ]),
        col(33.33, [
          tweetCard(
            "Jonas Weber",
            "@jweber_trades",
            "5h",
            "Hotkey to flatten all positions across venues. I didn't know how badly I needed this until today.",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
            "Avatar of Jonas Weber",
          ),
          tweetCard(
            "Camille Rousseau",
            "@camille_fx",
            "2d",
            "Four venues, one blotter, reconciling in real time. My CFO is going to love month-end for once.",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
            "Avatar of Camille Rousseau",
          ),
        ]),
        col(33.33, [
          tweetCard(
            "Leah Park",
            "@leah_scalps",
            "9h",
            "Charts stay butter smooth when I hot-swap timeframes at the open. That alone is a subscription-worth feature.",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
            "Avatar of Leah Park",
          ),
          tweetCard(
            "Kenji Sato",
            "@kenji_dev",
            "3d",
            "Their API docs read like they were written by engineers who actually use them. Wild concept.",
            "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&q=80",
            "Avatar of Kenji Sato",
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Twitter-Style Wall",
    description: "Six tweet-like cards with avatar, handle, timestamp, and quote",
    category: "testimonials",
    slug: "testimonials-twitter-style",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
