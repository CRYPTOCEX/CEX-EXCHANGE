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

const statBlock = (value: string, label: string) =>
  col(50, [
    el.heading(value, {
      level: "h4",
      fontSize: 26,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 4,
      letterSpacing: "-0.02em",
    }),
    el.text(label, {
      fontSize: 12,
      fontWeight: "500",
      color: theme.textDim,
      marginBottom: 0,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }),
  ]);

const caseStudy = (
  image: string,
  category: string,
  company: string,
  title: string,
  excerpt: string,
  stat1Value: string,
  stat1Label: string,
  stat2Value: string,
  stat2Label: string
) => ({
  ...col(50, [], {
    backgroundColor: theme.bgCard,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 28,
    paddingRight: 28,
  }),
  rows: [
    row(
      [
        col(100, [
          el.image(image, title, {
            width: "100%",
            height: "240px",
            objectFit: "cover",
            borderRadius: 14,
            marginBottom: 24,
          }),
          el.text(`${category} · ${company}`, {
            fontSize: 12,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.2em",
            marginBottom: 12,
          }),
          el.heading(title, {
            level: "h3",
            fontSize: 26,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 12,
            letterSpacing: "-0.02em",
            lineHeight: "1.2",
          }),
          el.text(excerpt, {
            fontSize: 15,
            lineHeight: "1.65",
            color: theme.textMuted,
            marginBottom: 0,
          }),
        ]),
      ],
      { gutter: 0, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
    ),
    row([statBlock(stat1Value, stat1Label), statBlock(stat2Value, stat2Label)], {
      gutter: 20,
      maxWidth: "100%",
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 24,
      marginTop: 24,
      borderTop: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
    }),
  ],
});

export const blogCaseStudiesGrid: Section = section(
  [
    singleColumnRow([
      el.text("CASE STUDIES", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        marginBottom: 14,
        textAlign: "center",
      }),
      el.heading("Real teams, real numbers", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "How the teams we work with cut latency, grew revenue, and shipped faster — with the metrics to prove it.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        caseStudy(
          "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
          "HFT",
          "Meridian Capital",
          "How Meridian cut round-trip latency by 62%",
          "A deep dive into how Meridian refactored their order-routing stack to shave milliseconds off every trade.",
          "62%",
          "Latency reduction",
          "$4.2M",
          "Annual P&L lift"
        ),
        caseStudy(
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
          "FINTECH",
          "Axiom Markets",
          "From 3 to 30,000 users in under a year",
          "Axiom's playbook for scaling an options platform — product, infrastructure, and go-to-market in lockstep.",
          "10,000x",
          "User growth",
          "24/7",
          "Market coverage"
        ),
      ],
      { ...rowPresets.wide, gutter: 32, verticalAlign: "top", marginBottom: 32 }
    ),
    row(
      [
        caseStudy(
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
          "DEFI",
          "Helios DAO",
          "Securing $1.2B in TVL with automated audits",
          "Helios replaced quarterly audits with a continuous fuzzing pipeline — and caught two critical bugs pre-launch.",
          "$1.2B",
          "TVL secured",
          "2",
          "Critical bugs caught"
        ),
        caseStudy(
          "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
          "INFRASTRUCTURE",
          "Nebula Labs",
          "Cutting their infra bill by 78% in one quarter",
          "Nebula moved to a hybrid edge + origin model and slashed their monthly spend — without sacrificing latency.",
          "78%",
          "Cost reduction",
          "3ms",
          "P99 latency"
        ),
      ],
      { ...rowPresets.wide, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Case Studies Grid",
    description: "Larger case-study cards featuring stat metrics and customer stories",
    category: "blog",
    slug: "blog-case-studies-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
