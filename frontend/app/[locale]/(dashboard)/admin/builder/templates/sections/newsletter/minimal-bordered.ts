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

export const newsletterMinimalBordered: Section = section(
  [
    row(
      [
        col(75, [
          el.text("Subscribe for weekly updates", {
            fontSize: 15,
            fontWeight: "500",
            color: theme.textDim,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 20,
            paddingRight: 16,
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.text("Subscribe →", {
            fontSize: 15,
            fontWeight: "600",
            color: theme.text,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 16,
            paddingRight: 20,
            marginBottom: 0,
            textAlign: "right",
            cursor: "pointer",
          }),
        ]),
      ],
      {
        gutter: 0,
        maxWidth: "560px",
        paddingLeft: 0,
        paddingRight: 0,
        borderColor: theme.text,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 12,
        verticalAlign: "middle",
      }
    ),
  ],
  {
    name: "Minimal Bordered Newsletter",
    description: "A single bordered input-and-button line — zero extra chrome",
    category: "newsletter",
    slug: "newsletter-minimal-bordered",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
