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

const copy = (eyebrow: string, title: string, description: string, bullets: string[], accent: string) => [
  el.text(eyebrow, {
    fontSize: 13,
    fontWeight: "700",
    color: accent,
    letterSpacing: "0.16em",
    marginBottom: 16,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 38,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 16,
    letterSpacing: "-0.02em",
    lineHeight: "1.12",
  }),
  el.text(description, {
    fontSize: 17,
    color: theme.textMuted,
    marginBottom: 20,
    lineHeight: "1.7",
  }),
  el.list(bullets, { fontSize: 15, color: theme.text }),
];

const imageCol = (src: string, alt: string) => [
  el.image(src, alt, {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    boxShadowX: 0,
    boxShadowY: 16,
    boxShadowBlur: 40,
    boxShadowColor: "rgba(10,18,32,0.08)",
  }),
];

export const featuresAlternatingImage: Section = section(
  [
    singleColumnRow([
      el.heading("Three pillars, one workflow", {
        level: "h2",
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
      }),
      el.text(
        "Every feature is designed to reduce the distance between your idea and production.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 80,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(50, copy(
          "COLLABORATE",
          "Ship together, in real time",
          "Cursors, comments, and version history — without leaving the canvas your team already lives in.",
          [
            "Live multiplayer on every surface",
            "Threaded inline comments with resolutions",
            "Branch, review, and merge without conflicts",
          ],
          theme.primary
        )),
        col(50, imageCol(
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",
          "Team collaborating at a whiteboard session"
        )),
      ],
      { ...rowPresets.wide, gutter: 56, marginBottom: 80 }
    ),
    row(
      [
        col(50, imageCol(
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
          "Analytics dashboard with live metrics"
        )),
        col(50, copy(
          "MEASURE",
          "Analytics that answer why",
          "Cohorted funnels, session replays, and revenue attribution — unified under the same primary key.",
          [
            "No-code funnel and retention analysis",
            "Session replay with privacy-safe defaults",
            "Revenue attribution across every channel",
          ],
          theme.emerald
        )),
      ],
      { ...rowPresets.wide, gutter: 56, marginBottom: 80 }
    ),
    row(
      [
        col(50, copy(
          "AUTOMATE",
          "Workflows that run themselves",
          "Trigger jobs from any event and compose them into durable workflows with retry and observability baked in.",
          [
            "Durable execution with at-least-once delivery",
            "Visual workflow editor with code escape hatches",
            "Built-in retries, timeouts, and dead-letter queues",
          ],
          theme.violet
        )),
        col(50, imageCol(
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
          "Circuit board representing automated workflows"
        )),
      ],
      { ...rowPresets.wide, gutter: 56 }
    ),
  ],
  {
    name: "Alternating Image Features",
    description: "Three zigzag rows of image-and-text splits with bulleted benefits",
    category: "features",
    slug: "features-alternating-image",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
