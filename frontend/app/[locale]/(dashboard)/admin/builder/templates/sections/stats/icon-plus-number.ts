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
import type { Element, ColorValue } from "@/types/builder";

const iconStat = (
  icon: string,
  value: string,
  label: string,
  sub: string,
  tint: ColorValue,
  tintBg: ColorValue,
): Element =>
  el.card({ padding: 36, borderRadius: 18 }, [
    el.icon(icon, {
      size: 28,
      color: tint,
      backgroundColor: tintBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 24,
    }),
    el.heading(value, {
      fontSize: 56,
      fontWeight: "700",
      letterSpacing: "-0.02em",
      color: theme.text,
      marginBottom: 8,
      level: "h3",
    }),
    el.text(label, {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 6,
    }),
    el.text(sub, {
      fontSize: 14,
      color: theme.textMuted,
      marginBottom: 0,
      lineHeight: "1.55",
    }),
  ]);

export const statsIconPlusNumber: Section = section(
  [
    singleColumnRow([
      el.text("PLATFORM AT A GLANCE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("The numbers behind the product", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 48,
      }),
    ]),
    row(
      [
        col(33.33, [
          iconStat(
            "TrendingUp",
            "$2.4B",
            "Daily trading volume",
            "Cleared across spot, futures, and options venues every 24 hours.",
            theme.emerald,
            "[hsl(var(--success)/0.14)]",
          ),
        ]),
        col(33.33, [
          iconStat(
            "Users",
            "240K",
            "Active traders",
            "Verified monthly actives across 140 countries and 12 languages.",
            theme.sky,
            "[hsl(var(--info)/0.14)]",
          ),
        ]),
        col(33.33, [
          iconStat(
            "ShieldCheck",
            "24/7",
            "Markets open",
            "Crypto never closes — and neither does the desk.",
            theme.violet,
            "[hsl(var(--chart-4)/0.16)]",
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Icon + Number",
    description: "Three stat cards each with an icon, big number, and label",
    category: "stats",
    slug: "stats-icon-plus-number",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
