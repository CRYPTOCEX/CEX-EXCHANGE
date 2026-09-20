import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const infoBlock = (iconName: string, label: string, lines: string[]) =>
  el.card(
    {
      padding: 24,
      borderRadius: 16,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      marginBottom: 16,
    },
    [
      el.icon(iconName, {
        size: 22,
        color: theme.primary,
        marginBottom: 12,
      }),
      el.text(label, {
        fontSize: 12,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 8,
      }),
      ...lines.map((line, i) =>
        el.text(line, {
          fontSize: 15,
          fontWeight: i === 0 ? "600" : "400",
          color: i === 0 ? theme.text : theme.textMuted,
          marginBottom: i === lines.length - 1 ? 0 : 4,
          lineHeight: "1.5",
        })
      ),
    ]
  );

export const contactMapEmbedSplit: Section = section(
  [
    row(
      [
        col(55, [
          el.card(
            {
              padding: 0,
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.bgCard,
            },
            [
              el.image(
                "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80",
                "Map showing our Singapore headquarters at 38 Beach Road",
                {
                  width: "100%",
                  height: "620px",
                  objectFit: "cover",
                  borderRadius: 0,
                  marginBottom: 0,
                }
              ),
            ]
          ),
        ]),
        col(45, [
          el.text("VISIT US", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 12,
          }),
          el.heading("Drop by the Singapore HQ", {
            fontSize: 36,
            fontWeight: "800",
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }),
          infoBlock("map-pin", "ADDRESS", [
            "38 Beach Road, #29-11",
            "South Beach Tower",
            "Singapore 189767",
          ]),
          infoBlock("clock", "HOURS", [
            "Monday – Friday",
            "9:00 – 19:00 SGT",
            "Trading support runs 24/7",
          ]),
          infoBlock("phone", "CONTACT", [
            "+65 6817 4402",
            "hello@company.com",
          ]),
        ]),
      ],
      { ...rowPresets.contained, gutter: 40, verticalAlign: "top" }
    ),
  ],
  {
    name: "Map Embed Split",
    description: "Map image on the left with contact info and hours on the right",
    category: "contact",
    slug: "contact-map-embed-split",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
