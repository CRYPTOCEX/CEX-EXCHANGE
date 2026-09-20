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

export const aboutFoundersLetter: Section = section(
  [
    row(
      [
        col(15, []),
        col(70, [
          el.text("A LETTER FROM THE FOUNDERS", {
            fontSize: 13,
            fontWeight: "700",
            textAlign: "center",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("To everyone who has ever hit refresh at 3:59 AM.", {
            textAlign: "center",
            fontSize: 40,
            fontWeight: "600",
            letterSpacing: "-0.02em",
            lineHeight: "1.25",
            marginBottom: 40,
            color: theme.text,
            fontStyle: "italic",
          }),
          el.text(
            "When we started this company in 2018, we had one question taped above the desk: would we use what we are building?",
            {
              fontSize: 20,
              lineHeight: "1.75",
              color: theme.text,
              textAlign: "left",
              marginBottom: 20,
              maxWidth: "680px",
            }
          ),
          el.text(
            "Seven years later, we still trade on our own platform. We still feel the latency. We still see the fills. And every engineer on the team has shadowed a live desk during a volatile open at least once a quarter.",
            {
              fontSize: 18,
              lineHeight: "1.8",
              color: theme.textMuted,
              marginBottom: 20,
              maxWidth: "680px",
            }
          ),
          el.text(
            "That is the only way we know how to build. From the inside out. From the order book up. From the people who actually press the button.",
            {
              fontSize: 18,
              lineHeight: "1.8",
              color: theme.textMuted,
              marginBottom: 20,
              maxWidth: "680px",
            }
          ),
          el.text(
            "Thank you for every trade, every email, every feature request, and every bug report. We read them all. We still will.",
            {
              fontSize: 18,
              lineHeight: "1.8",
              color: theme.textMuted,
              marginBottom: 40,
              maxWidth: "680px",
            }
          ),
          el.text("With gratitude,", {
            fontSize: 17,
            color: theme.textMuted,
            marginBottom: 8,
            fontStyle: "italic",
          }),
          el.heading("Maya Chen & Jordan Park", {
            fontSize: 28,
            fontWeight: "500",
            letterSpacing: "-0.01em",
            color: theme.text,
            marginBottom: 6,
            fontFamily: "cursive",
            fontStyle: "italic",
          }),
          el.text("Co-founders, CEO & COO", {
            fontSize: 14,
            color: theme.textDim,
            marginBottom: 0,
          }),
        ]),
        col(15, []),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
  ],
  {
    name: "Founders Letter",
    description: "Centered handwritten-feel letter with signature",
    category: "about",
    slug: "about-founders-letter",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
