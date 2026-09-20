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
  gradients,
} from "../../utils";
import type { Element } from "@/types/builder";

const caseCard = (
  metric: string,
  metricLabel: string,
  quote: string,
  name: string,
  role: string,
  avatarSrc: string,
  alt: string,
  href: string,
  accent: (typeof gradients)[keyof typeof gradients],
): Element =>
  el.card(
    {
      padding: 40,
      borderRadius: 20,
      borderWidth: 1,
    },
    [
      el.card(
        {
          padding: 28,
          borderRadius: 14,
          borderWidth: 0,
          backgroundColor: accent,
          marginBottom: 28,
        },
        [
          el.heading(metric, {
            fontSize: 56,
            fontWeight: "800",
            color: theme.onBand,
            letterSpacing: "-0.02em",
            marginBottom: 8,
            level: "h3",
          }),
          el.text(metricLabel, {
            fontSize: 14,
            fontWeight: "600",
            color: theme.onBandMuted,
            letterSpacing: "0.06em",
            marginBottom: 0,
          }),
        ]
      ),
      el.quote(quote, name, {
        fontSize: 19,
        lineHeight: "1.55",
        color: theme.text,
        marginBottom: 24,
      }),
      el.image(avatarSrc, alt, {
        width: "44px",
        height: "44px",
        borderRadius: 999,
        marginBottom: 12,
      }),
      el.text(name, {
        fontSize: 15,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 2,
      }),
      el.text(role, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 20,
      }),
      el.link("Read the case study →", href, {
        fontSize: 15,
        fontWeight: "600",
        color: theme.primary,
      }),
    ]
  );

export const testimonialsCaseStudyPreview: Section = section(
  [
    singleColumnRow([
      el.text("CASE STUDIES", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Results our customers can measure", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Deep-dive stories from the desks that rebuilt their trading operation around our platform.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(50, [
          caseCard(
            "−42%",
            "REDUCTION IN SLIPPAGE",
            "We rebuilt our execution stack in six weeks and our head of trading called the difference 'embarrassing in the best way'.",
            "Daniel Voss",
            "CTO, Axiom Markets",
            "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&q=80",
            "Portrait of Daniel Voss",
            "/case-studies/axiom-markets",
            gradients.skyEmerald,
          ),
        ]),
        col(50, [
          caseCard(
            "3.2×",
            "FASTER RESEARCH CYCLE",
            "The backtester and live-paper environment share a single code path. Our researchers now ship a strategy per sprint.",
            "Priya Desai",
            "Quant Lead, Helix Strategies",
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
            "Portrait of Priya Desai",
            "/case-studies/helix-strategies",
            gradients.indigoViolet,
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Case Study Preview",
    description: "Two cards with metric stat, customer quote, and Read case study link",
    category: "testimonials",
    slug: "testimonials-case-study-preview",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
