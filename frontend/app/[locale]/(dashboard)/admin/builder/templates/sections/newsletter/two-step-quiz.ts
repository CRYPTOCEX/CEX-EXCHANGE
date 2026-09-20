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

const rolePill = (label: string, active = false) =>
  el.text(label, {
    fontSize: 14,
    fontWeight: "600",
    color: active ? theme.primaryText : theme.text,
    backgroundColor: active ? theme.primary : theme.bgCard,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? theme.primary : theme.border,
    borderRadius: 999,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 18,
    paddingRight: 18,
    marginRight: 8,
    marginBottom: 8,
    display: "inline-block",
    cursor: "pointer",
  });

export const newsletterTwoStepQuiz: Section = section(
  [
    singleColumnRow([
      el.text("STEP 1 OF 2", {
        fontSize: 11,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("Tailor your newsletter", {
        level: "h2",
        fontSize: 38,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text("What's your role? We'll customize every issue to match.", {
        fontSize: 16,
        textAlign: "center",
        color: theme.textMuted,
        marginBottom: 28,
        lineHeight: "1.6",
      }),
    ]),
    singleColumnRow(
      [
        rolePill("Trader", true),
        rolePill("Analyst"),
        rolePill("Engineer"),
        rolePill("Founder"),
        rolePill("Investor"),
        rolePill("Student"),
      ],
      { marginBottom: 28, textAlign: "center" }
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
          el.button("Continue →", "#", {
            width: "100%",
            marginTop: 0,
            marginRight: 0,
            textAlign: "center",
          }),
        ]),
      ],
      { ...rowPresets.narrow, gutter: 10, maxWidth: "540px" }
    ),
  ],
  {
    name: "Two-Step Quiz Newsletter",
    description: "Role pill selector above an email form — step one of a personalized signup",
    category: "newsletter",
    slug: "newsletter-two-step-quiz",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgSubtle,
    },
  }
);
