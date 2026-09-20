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

const emailInput = () =>
  el.text("you@company.com", {
    fontSize: 16,
    color: theme.textDim,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    borderRadius: 10,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 18,
    marginBottom: 0,
  });

export const newsletterCenteredSimple: Section = section(
  [
    singleColumnRow([
      el.heading("Join the newsletter", {
        level: "h2",
        fontSize: 40,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "One quick read every Thursday on markets, macro, and the quiet trends worth watching.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "520px",
          marginBottom: 32,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(70, [emailInput()]),
        col(30, [
          el.button("Subscribe", "#", {
            width: "100%",
            marginTop: 0,
            marginRight: 0,
            textAlign: "center",
          }),
        ]),
      ],
      { ...rowPresets.narrow, gutter: 12, maxWidth: "520px" }
    ),
    singleColumnRow([
      el.text("No spam, unsubscribe anytime.", {
        fontSize: 13,
        textAlign: "center",
        color: theme.textDim,
        marginTop: 16,
        marginBottom: 0,
      }),
    ]),
  ],
  {
    name: "Centered Simple Newsletter",
    description: "Headline, email input, and subscribe button — perfectly centered and minimal",
    category: "newsletter",
    slug: "newsletter-centered-simple",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
