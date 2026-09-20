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

const perk = (text: string) =>
  el.text(text, {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textMuted,
    marginBottom: 0,
    marginRight: 16,
    paddingLeft: 22,
    backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "left center",
    display: "inline-block",
  });

export const newsletterWithBadgePerks: Section = section(
  [
    singleColumnRow([
      el.text("WEEKLY", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        backgroundColor: theme.primarySoft,
        borderRadius: 999,
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 20,
        maxWidth: "88px",
        marginLeft: "auto",
        marginRight: "auto",
        letterSpacing: "0.12em",
        textAlign: "center",
      }),
      el.heading("One email. Thursday mornings.", {
        level: "h2",
        fontSize: 42,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "A curated read on markets, macro, and builder-friendly tech. Free forever, no credit card required.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 24,
          lineHeight: "1.6",
        }
      ),
    ]),
    singleColumnRow(
      [perk("No spam"), perk("Unsubscribe anytime"), perk("Private by default")],
      { marginBottom: 32, textAlign: "center" }
    ),
    row(
      [
        col(70, [
          el.text("you@company.com", {
            fontSize: 15,
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
          }),
        ]),
        col(30, [
          el.button("Join the list", "#", {
            width: "100%",
            marginTop: 0,
            marginRight: 0,
            textAlign: "center",
          }),
        ]),
      ],
      { ...rowPresets.narrow, gutter: 12, maxWidth: "540px" }
    ),
  ],
  {
    name: "Badge + Perks Newsletter",
    description: "Weekly pill above headline with a perks row and signup form below",
    category: "newsletter",
    slug: "newsletter-with-badge-perks",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
