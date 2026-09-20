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

const cardSettings = {
  backgroundColor: theme.bgCard,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.border,
  borderRadius: 18,
  padding: 32,
  transitionProperty: "transform, box-shadow, border-color",
  transitionDuration: 250,
  transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  hoverBorderColor: theme.primary,
  boxShadowX: 0,
  boxShadowY: 2,
  boxShadowBlur: 8,
  boxShadowColor: "rgba(10,18,32,0.03)",
};

const hoverCard = (
  icon: string,
  title: string,
  description: string,
  accent: string
) =>
  col(33.33, [
    el.icon(icon, {
      size: 32,
      color: accent,
      backgroundColor: "rgba(31,113,235,0.14)",
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    }),
    el.heading(title, {
      level: "h3",
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 10,
      letterSpacing: "-0.01em",
    }),
    el.text(description, {
      fontSize: 15,
      color: theme.textMuted,
      lineHeight: "1.7",
      marginBottom: 20,
    }),
    el.link("Learn more", "#", {
      color: accent,
      fontSize: 14,
      fontWeight: "600",
    }),
  ], cardSettings);

export const featuresIconCardsHover: Section = section(
  [
    singleColumnRow([
      el.text("CORE FEATURES", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("Thoughtful defaults. Infinite control.", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
      }),
      el.text(
        "Six capabilities engineered to work together — opt out of any of them without rewriting everything else.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        hoverCard(
          "lucide:zap",
          "Instant cold starts",
          "40ms boot times on shared infra — 10ms on dedicated. No more spin-up lag.",
          theme.primary
        ),
        hoverCard(
          "lucide:git-branch",
          "Branching environments",
          "Every pull request gets its own isolated stack with a live URL.",
          theme.emerald
        ),
        hoverCard(
          "lucide:activity",
          "Live observability",
          "Traces, metrics, and logs in one place — correlated by request ID.",
          theme.sky
        ),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24 }
    ),
    row(
      [
        hoverCard(
          "lucide:shield-check",
          "Security by default",
          "Encrypted secrets, rotating tokens, and audit trails on every action.",
          theme.violet
        ),
        hoverCard(
          "lucide:users",
          "Team collaboration",
          "Live cursors, threaded comments, and atomic version history built in.",
          theme.amber
        ),
        hoverCard(
          "lucide:puzzle",
          "Composable by design",
          "An open SDK, webhooks everywhere, and zero vendor lock-in.",
          theme.rose
        ),
      ],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "Hoverable Icon Cards",
    description: "Two rows of three hoverable cards with icon, title, and learn-more link",
    category: "features",
    slug: "features-icon-cards-hover",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
