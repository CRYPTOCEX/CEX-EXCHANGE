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

const logoBadge = (label: string): Element =>
  el.text(label, {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    letterSpacing: "0.05em",
    marginBottom: 24,
    textAlign: "left",
  });

export const testimonialsLogoPlusQuote: Section = section(
  [
    singleColumnRow([
      el.text("LOVED BY LEADING DESKS", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Teams trading with us", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 48,
      }),
    ]),
    row(
      [
        col(33.33, [
          el.card({ padding: 36 }, [
            logoBadge("◆ MERIDIAN"),
            el.quote(
              "We moved our entire equities book onto the platform and never looked back. The consolidated blotter alone pays for the seat.",
              "Sara Lin",
              { fontSize: 18, marginBottom: 24 }
            ),
            el.image(
              "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
              "Portrait of Sara Lin",
              { width: "48px", height: "48px", borderRadius: 999, marginBottom: 12 }
            ),
            el.text("Sara Lin", {
              fontSize: 15,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 2,
            }),
            el.text("Senior Trader, Meridian Capital", {
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]),
        ]),
        col(33.33, [
          el.card({ padding: 36 }, [
            logoBadge("▲ NORTHGATE"),
            el.quote(
              "Low-touch routing that actually stays low-touch. We migrated 40% of our flow in a week without a hitch.",
              "Marcus Okafor",
              { fontSize: 18, marginBottom: 24 }
            ),
            el.image(
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
              "Portrait of Marcus Okafor",
              { width: "48px", height: "48px", borderRadius: 999, marginBottom: 12 }
            ),
            el.text("Marcus Okafor", {
              fontSize: 15,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 2,
            }),
            el.text("Head of Execution, Northgate Securities", {
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]),
        ]),
        col(33.33, [
          el.card({ padding: 36 }, [
            logoBadge("● HELIX"),
            el.quote(
              "The backtester saved us three quarters of debugging time. Our research-to-production cycle is shorter than ever.",
              "Priya Desai",
              { fontSize: 18, marginBottom: 24 }
            ),
            el.image(
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
              "Portrait of Priya Desai",
              { width: "48px", height: "48px", borderRadius: 999, marginBottom: 12 }
            ),
            el.text("Priya Desai", {
              fontSize: 15,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 2,
            }),
            el.text("Quant Lead, Helix Strategies", {
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Logo + Quote",
    description: "Customer logo above each quote in a three-column grid",
    category: "testimonials",
    slug: "testimonials-logo-plus-quote",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
