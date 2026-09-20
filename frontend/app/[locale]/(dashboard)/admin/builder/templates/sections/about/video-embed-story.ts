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

export const aboutVideoEmbedStory: Section = section(
  [
    singleColumnRow([
      el.text("WATCH THE STORY", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Four minutes of context before you keep reading.", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
        maxWidth: "820px",
      }),
      el.text(
        "A short film about the people behind the platform, filmed during our 2024 retreat in Lisbon.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 48,
        }
      ),
    ]),
    singleColumnRow(
      [
        el.card(
          {
            padding: 0,
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            backgroundColor: theme.bgMuted,
            borderWidth: 0,
            boxShadowX: 0,
            boxShadowY: 40,
            boxShadowBlur: 80,
            boxShadowSpread: -20,
            boxShadowColor: "rgba(10,18,32,0.25)",
          },
          [
            el.image(
              "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
              "Video thumbnail showing a trader at multi-monitor desk",
              {
                width: "100%",
                height: "auto",
                borderRadius: 24,
                marginBottom: 0,
              }
            ),
            el.icon("play-circle", {
              size: 96,
              color: theme.onBand,
              position: "absolute",
              top: "50%",
              left: "50%",
              translateX: -48,
              translateY: -48,
              marginBottom: 0,
            }),
          ]
        ),
      ],
      { ...rowPresets.contained, maxWidth: "1080px", paddingTop: 0, paddingBottom: 48 }
    ),
    row(
      [
        col(50, [
          el.heading("Why we filmed this", {
            fontSize: 24,
            fontWeight: "700",
            letterSpacing: "-0.01em",
            marginBottom: 12,
          }),
          el.text(
            "We have written a lot of words about who we are. Last year, we decided to hand the camera to our team for a week and see what came back. The result is unscripted, a little rough, and the most honest portrait of the company we have.",
            { fontSize: 17, marginBottom: 0 }
          ),
        ]),
        col(50, [
          el.heading("What you will see", {
            fontSize: 24,
            fontWeight: "700",
            letterSpacing: "-0.01em",
            marginBottom: 12,
          }),
          el.text(
            "Our CEO mid-sentence before a market open. A risk engineer debugging at 2 AM. A product manager reviewing a design with a customer on Zoom. The small things that add up to a company.",
            { fontSize: 17, marginBottom: 0 }
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 48 }
    ),
  ],
  {
    name: "Video Embed Story",
    description: "Video thumbnail with surrounding story copy",
    category: "about",
    slug: "about-video-embed-story",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
