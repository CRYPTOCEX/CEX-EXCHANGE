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

const imageCol = (src: string, alt: string) => [
  el.image(src, alt, {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    boxShadowX: 0,
    boxShadowY: 20,
    boxShadowBlur: 44,
    boxShadowColor: "rgba(10,18,32,0.1)",
  }),
];

const copyCol = (
  eyebrow: string,
  eyebrowColor: string,
  title: string,
  description: string,
  bullets: string[],
  ctaLabel: string,
  ctaLink: string
) => [
  el.text(eyebrow, {
    fontSize: 13,
    fontWeight: "700",
    color: eyebrowColor,
    letterSpacing: "0.18em",
    marginBottom: 16,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 36,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 16,
    letterSpacing: "-0.025em",
    lineHeight: "1.12",
    maxWidth: "480px",
  }),
  el.text(description, {
    fontSize: 17,
    color: theme.textMuted,
    marginBottom: 20,
    lineHeight: "1.7",
    maxWidth: "500px",
  }),
  el.list(bullets, { fontSize: 15, color: theme.text, marginBottom: 28 }),
  el.link(ctaLabel + "  →", ctaLink, {
    color: eyebrowColor,
    fontSize: 15,
    fontWeight: "600",
  }),
];

export const featuresZigzagDetailed: Section = section(
  [
    singleColumnRow([
      el.text("PRODUCT TOUR", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("A deeper look at what makes it click", {
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
        "Every feature earns its place. Here are the four that teams tell us change the way they work.",
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
        col(50, copyCol(
          "REAL-TIME CANVAS",
          theme.primary,
          "See ideas move before they’re finished",
          "Cursors, live selections, and instant comments make the difference between brainstorming and actually deciding.",
          [
            "Multiplayer on every surface, no add-ons",
            "Presence indicators with scoped permissions",
            "Session replay built in for async teams",
          ],
          "Explore the canvas",
          "/canvas"
        )),
        col(50, imageCol(
          "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80",
          "Live collaborative canvas session with multiple contributors"
        )),
      ],
      { ...rowPresets.wide, gutter: 56, marginBottom: 100 }
    ),
    row(
      [
        col(50, imageCol(
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
          "Dashboard with live analytics and funnel breakdown"
        )),
        col(50, copyCol(
          "DEEP ANALYTICS",
          theme.emerald,
          "Answers to the questions you actually ask",
          "Funnels, cohorts, and revenue attribution wired up in minutes — with a query engine that scales to billions of events.",
          [
            "Self-serve funnels for every team",
            "Revenue attribution without a data engineer",
            "Ten-year history, no sampling",
          ],
          "View a sample dashboard",
          "/dashboard"
        )),
      ],
      { ...rowPresets.wide, gutter: 56, marginBottom: 100 }
    ),
    row(
      [
        col(50, copyCol(
          "WORKFLOWS",
          theme.violet,
          "Durable automation without the drift",
          "Compose jobs in plain TypeScript or Python with automatic retries, timeouts, and dead-letter queues.",
          [
            "At-least-once delivery by default",
            "Visual editor with a code escape hatch",
            "Version, branch, and replay any run",
          ],
          "Tour the workflow engine",
          "/workflows"
        )),
        col(50, imageCol(
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
          "Circuit board pattern symbolising automated workflows"
        )),
      ],
      { ...rowPresets.wide, gutter: 56, marginBottom: 100 }
    ),
    row(
      [
        col(50, imageCol(
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
          "Global network visualization with points of presence"
        )),
        col(50, copyCol(
          "GLOBAL EDGE",
          theme.sky,
          "Fast everywhere, not just in the demo",
          "300+ points of presence, smart anycast routing, and cold starts under 40ms for workloads that need to feel instant.",
          [
            "Anycast routing with automatic failover",
            "Regional data residency on demand",
            "Free egress inside the platform",
          ],
          "See the edge map",
          "/edge"
        )),
      ],
      { ...rowPresets.wide, gutter: 56 }
    ),
  ],
  {
    name: "Zigzag Detailed Features",
    description: "Four detailed alternating feature rows with bullets and secondary CTAs",
    category: "features",
    slug: "features-zigzag-detailed",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
