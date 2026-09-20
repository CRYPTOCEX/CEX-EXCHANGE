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

const avatar = (src: string, alt: string) =>
  el.image(src, alt, {
    width: "56px",
    height: "56px",
    borderRadius: 999,
    marginBottom: 16,
  });

export const testimonialsThreeColumnCards: Section = section(
  [
    singleColumnRow([
      el.text("TESTIMONIALS", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Trusted by thousands of traders worldwide", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        color: theme.text,
        marginBottom: 16,
        maxWidth: "760px",
      }),
      el.text(
        "From independent day traders to institutional desks, teams choose our platform for speed, reliability, and depth.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          el.card({}, [
            avatar(
              "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
              "Portrait of Sara Lin",
            ),
            el.quote(
              "Execution is lightning fast. The charts beat every competitor I've used over a decade on the desk.",
              "Sara Lin",
              { marginBottom: 20 }
            ),
            el.text("Sara Lin", {
              fontSize: 16,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 4,
            }),
            el.text("Senior Trader, Meridian Capital", {
              fontSize: 14,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]),
        ]),
        col(33.33, [
          el.card({}, [
            avatar(
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
              "Portrait of Marcus Okafor",
            ),
            el.quote(
              "We migrated 40% of our flow in a week. Risk controls and API latency finally matched our internal benchmarks.",
              "Marcus Okafor",
              { marginBottom: 20 }
            ),
            el.text("Marcus Okafor", {
              fontSize: 16,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 4,
            }),
            el.text("Head of Execution, Northgate Securities", {
              fontSize: 14,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]),
        ]),
        col(33.33, [
          el.card({}, [
            avatar(
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
              "Portrait of Priya Desai",
            ),
            el.quote(
              "The backtester saved us three quarters of debugging time. What used to be a sprint is now a single afternoon.",
              "Priya Desai",
              { marginBottom: 20 }
            ),
            el.text("Priya Desai", {
              fontSize: 16,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 4,
            }),
            el.text("Quant Lead, Helix Strategies", {
              fontSize: 14,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Three-Column Cards",
    description: "Three quote cards with avatar, name, and role",
    category: "testimonials",
    slug: "testimonials-three-column-cards",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
