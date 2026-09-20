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

const entry = (
  quote: string,
  name: string,
  role: string,
  avatarSrc: string,
  alt: string,
): Element[] => [
  el.quote(quote, name, {
    fontSize: 26,
    lineHeight: "1.45",
    fontWeight: "500",
    color: theme.text,
    letterSpacing: "-0.01em",
    marginBottom: 24,
  }),
  el.image(avatarSrc, alt, {
    width: "44px",
    height: "44px",
    borderRadius: 999,
    marginBottom: 12,
    display: "inline-block",
  }),
  el.text(name, {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 2,
  }),
  el.text(role, {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

export const testimonialsMinimalStack: Section = section(
  [
    singleColumnRow([
      el.text("VOICES", {
        fontSize: 13,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Quietly changing how desks trade", {
        fontSize: 40,
        color: theme.text,
        marginBottom: 56,
      }),
    ]),
    singleColumnRow(entry(
      "Execution is lightning fast. After a decade on the desk, this is the first tool that keeps up with my hotkeys.",
      "Sara Lin",
      "Senior Trader, Meridian Capital",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
      "Portrait of Sara Lin",
    )),
    singleColumnRow([el.divider({ marginTop: 56, marginBottom: 56, borderColor: theme.border })]),
    singleColumnRow(entry(
      "We migrated 40% of our flow in a week with zero outages. That's the headline — the rest is gravy.",
      "Marcus Okafor",
      "Head of Execution, Northgate Securities",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
      "Portrait of Marcus Okafor",
    )),
    singleColumnRow([el.divider({ marginTop: 56, marginBottom: 56, borderColor: theme.border })]),
    singleColumnRow(entry(
      "The backtester saved us three quarters of debugging time. Our researchers ship twice as often.",
      "Priya Desai",
      "Quant Lead, Helix Strategies",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
      "Portrait of Priya Desai",
    )),
  ],
  {
    name: "Minimal Stack",
    description: "Vertical stack of three minimal quotes separated by dividers",
    category: "testimonials",
    slug: "testimonials-minimal-stack",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
