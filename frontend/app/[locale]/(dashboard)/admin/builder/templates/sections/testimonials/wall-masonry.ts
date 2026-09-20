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

const tile = (
  quote: string,
  name: string,
  role: string,
  avatarSrc: string,
  alt: string,
  padding = 28,
): Element =>
  el.card({ padding, borderRadius: 16, marginBottom: 24 }, [
    el.quote(quote, name, {
      fontSize: 17,
      lineHeight: "1.55",
      color: theme.text,
      marginBottom: 20,
    }),
    el.image(avatarSrc, alt, {
      width: "40px",
      height: "40px",
      borderRadius: 999,
      marginBottom: 12,
    }),
    el.text(name, {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 2,
    }),
    el.text(role, {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 0,
    }),
  ]);

export const testimonialsWallMasonry: Section = section(
  [
    singleColumnRow([
      el.heading("What traders are saying", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "A sampling from the desks, funds, and independent pros who rely on us every session.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          tile(
            "Execution is lightning fast. The order router shaves basis points off every fill.",
            "Ava Chen",
            "Equities Trader, Tidewater",
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
            "Portrait of Ava Chen",
            32,
          ),
          tile(
            "Customer support replies in minutes. That alone is worth the switch.",
            "Jonas Weber",
            "Prop Desk, Berliner Handel",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
            "Portrait of Jonas Weber",
          ),
          tile(
            "We went live in two weeks. Onboarding was the smoothest I've seen in fifteen years.",
            "Leah Park",
            "COO, Sidelight Capital",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
            "Portrait of Leah Park",
            24,
          ),
        ]),
        col(33.33, [
          tile(
            "The backtester saved us three quarters of debugging time on our momentum strategy.",
            "Ravi Mehta",
            "Quant Researcher, Orbit Labs",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
            "Portrait of Ravi Mehta",
          ),
          tile(
            "Real-time P&L across four venues in a single pane. I finally trust my numbers.",
            "Camille Rousseau",
            "FX Strategist, Rue Trading",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
            "Portrait of Camille Rousseau",
            36,
          ),
          tile(
            "Risk limits that actually work pre-trade. Operations stopped paging me at 2 a.m.",
            "Ibrahim Al-Haidari",
            "Head of Risk, Crestline FX",
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
            "Portrait of Ibrahim Al-Haidari",
          ),
        ]),
        col(33.33, [
          tile(
            "We migrated 40% of our flow in a week with zero outages. Unheard of.",
            "Sofia Almeida",
            "Director of Trading, Vela Markets",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
            "Portrait of Sofia Almeida",
            36,
          ),
          tile(
            "The API documentation is best-in-class. Our engineers love it.",
            "Kenji Sato",
            "CTO, Kobe Quant",
            "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&q=80",
            "Portrait of Kenji Sato",
          ),
          tile(
            "We cut our data-fee bill by 30% after consolidating onto the platform.",
            "Nadia Johansson",
            "CFO, Stockholm Trading Group",
            "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80",
            "Portrait of Nadia Johansson",
            28,
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Masonry Wall",
    description: "Masonry-style wall of varied-height quote tiles",
    category: "testimonials",
    slug: "testimonials-wall-masonry",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
