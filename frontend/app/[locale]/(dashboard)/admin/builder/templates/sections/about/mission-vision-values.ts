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

const pillar = (iconName: string, label: string, title: string, body: string) =>
  el.card(
    {
      padding: 36,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      height: "100%",
    },
    [
      el.icon(iconName, {
        size: 32,
        color: theme.primary,
        marginBottom: 20,
      }),
      el.text(label, {
        fontSize: 13,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.12em",
        marginBottom: 10,
      }),
      el.heading(title, {
        fontSize: 24,
        fontWeight: "700",
        letterSpacing: "-0.01em",
        marginBottom: 12,
        color: theme.text,
      }),
      el.text(body, {
        fontSize: 16,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const aboutMissionVisionValues: Section = section(
  [
    singleColumnRow([
      el.text("WHY WE BUILD", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Mission, vision, values", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Three sentences we stress-test every decision against.",
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
          pillar(
            "target",
            "MISSION",
            "Make markets more accessible",
            "Our mission is to make markets more accessible without lowering the bar on execution quality. Retail tools, institutional plumbing."
          ),
        ]),
        col(33.33, [
          pillar(
            "eye",
            "VISION",
            "A frictionless global market",
            "A world where a trader in Lagos, Lima, or Lisbon can route an order with the same latency and the same fee as a desk on Wall Street."
          ),
        ]),
        col(33.33, [
          pillar(
            "heart",
            "VALUES",
            "Transparent. Obsessive. Kind.",
            "We publish our uptime. We ship on Fridays when the code is right. We treat every trader on support like the only trader on support."
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Mission, Vision, Values",
    description: "Three-column grid of mission, vision, and values",
    category: "about",
    slug: "about-mission-vision-values",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
