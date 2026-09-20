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

export const aboutTwoColumnRich: Section = section(
  [
    singleColumnRow([
      el.text("WHO WE ARE", {
        fontSize: 13,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("An engineering company that happens to run an exchange.", {
        fontSize: 48,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
        marginBottom: 56,
        maxWidth: "880px",
      }),
    ]),
    row(
      [
        col(50, [
          el.text(
            "We are 240 engineers, quants, designers, and traders building the infrastructure that sits quietly under some of the most demanding financial workflows in the world. Our stack matches, clears, and settles in under a millisecond on a normal day and under three milliseconds on the ones people remember.",
            { fontSize: 18, lineHeight: "1.75", marginBottom: 24 }
          ),
          el.text(
            "Every product decision runs through two questions. Does this help the trader at their worst moment, when the market is moving and the clock matters? And is this how we would want to be treated, if the roles were reversed? If either answer is no, we ship nothing.",
            { fontSize: 18, lineHeight: "1.75", marginBottom: 24 }
          ),
          el.text(
            "The result is not a product so much as a posture. Fewer features, deeper ones. Slower releases, safer ones. Smaller team, more accountable.",
            { fontSize: 18, lineHeight: "1.75", marginBottom: 0 }
          ),
        ]),
        col(50, [
          el.text(
            "We are privately held, profitable since 2021, and intentionally small for the scale we operate at. Our investors are long-horizon: Sequoia Growth, Index Ventures, and a rotating cast of active traders who have been with us since the first seed round in 2018.",
            { fontSize: 18, lineHeight: "1.75", marginBottom: 24 }
          ),
          el.text(
            "Our headquarters are in Singapore. Our engineering leadership sits in Zurich. Our support desk runs twenty-four hours out of Brooklyn and Bengaluru. We do not chase headcount for the sake of it, but we do open two engineering roles every month.",
            { fontSize: 18, lineHeight: "1.75", marginBottom: 24 }
          ),
          el.text(
            "If you have read this far and any of it sounds like the place you have been looking for, the careers page is one click away. The front door is always open to serious operators.",
            { fontSize: 18, lineHeight: "1.75", marginBottom: 0 }
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 56 }
    ),
  ],
  {
    name: "Two-Column Rich Text",
    description: "Two paragraphs of rich copy in two columns",
    category: "about",
    slug: "about-two-column-rich",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
