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

const stars = (): Element =>
  el.text("★★★★★", {
    fontSize: 18,
    fontWeight: "700",
    color: theme.amber,
    letterSpacing: "0.05em",
    marginBottom: 16,
  });

const ratingCard = (
  quote: string,
  name: string,
  role: string,
  avatarSrc: string,
  alt: string,
): Element =>
  el.card({ padding: 28, borderRadius: 14 }, [
    stars(),
    el.quote(quote, name, {
      fontSize: 16,
      lineHeight: "1.55",
      color: theme.text,
      marginBottom: 24,
    }),
    el.image(avatarSrc, alt, {
      width: "40px",
      height: "40px",
      borderRadius: 999,
      marginBottom: 10,
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

export const testimonialsRatingGrid: Section = section(
  [
    singleColumnRow([
      el.heading("Rated 4.9/5 by active traders", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Aggregated from 2,400+ verified reviews across G2, Trustpilot, and the App Store.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          ratingCard(
            "Order routing is visibly tighter than my old broker. Saved me a small mortgage on slippage last quarter.",
            "Ava Chen",
            "Equities Trader",
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
            "Portrait of Ava Chen",
          ),
        ]),
        col(33.33, [
          ratingCard(
            "The alert engine is the best I've used. I get signal, not noise.",
            "Jonas Weber",
            "Prop Desk, Berliner Handel",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
            "Portrait of Jonas Weber",
          ),
        ]),
        col(33.33, [
          ratingCard(
            "Charts are fast enough to hot-swap timeframes during the open. No lag, ever.",
            "Leah Park",
            "Futures Scalper",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
            "Portrait of Leah Park",
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "top", marginBottom: 24 }
    ),
    row(
      [
        col(33.33, [
          ratingCard(
            "We cut our data-fee bill by 30% after consolidating onto the platform.",
            "Nadia Johansson",
            "CFO, Stockholm Trading Group",
            "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80",
            "Portrait of Nadia Johansson",
          ),
        ]),
        col(33.33, [
          ratingCard(
            "Onboarding walked the whole team through in an afternoon. Remarkable.",
            "Ravi Mehta",
            "Quant Researcher",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
            "Portrait of Ravi Mehta",
          ),
        ]),
        col(33.33, [
          ratingCard(
            "The mobile app is a real sibling of the desktop — not a stripped-down afterthought.",
            "Camille Rousseau",
            "FX Strategist",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
            "Portrait of Camille Rousseau",
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Rating Grid",
    description: "Six tiles each with a 5-star rating, short quote, and author",
    category: "testimonials",
    slug: "testimonials-rating-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
