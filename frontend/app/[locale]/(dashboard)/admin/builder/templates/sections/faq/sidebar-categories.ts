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

const catItem = (label: string, active = false) =>
  el.text(label, {
    fontSize: 15,
    fontWeight: active ? "600" : "500",
    color: active ? theme.primary : theme.textMuted,
    backgroundColor: active ? theme.primarySoft : "transparent",
    borderRadius: 10,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 4,
    cursor: "pointer",
  });

const qa = (question: string, answer: string) => [
  el.heading(question, {
    level: "h3",
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 10,
    letterSpacing: "-0.01em",
  }),
  el.text(answer, {
    fontSize: 16,
    lineHeight: "1.7",
    color: theme.textMuted,
    marginBottom: 32,
  }),
];

export const faqSidebarCategories: Section = section(
  [
    singleColumnRow([
      el.heading("Browse the docs", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "Pick a category on the left. Answers appear on the right — no navigation required.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(
          30,
          [
            el.text("CATEGORIES", {
              fontSize: 11,
              fontWeight: "700",
              color: theme.textDim,
              letterSpacing: "0.2em",
              marginBottom: 16,
              paddingLeft: 16,
            }),
            catItem("Getting started", true),
            catItem("Account & security"),
            catItem("Deposits & withdrawals"),
            catItem("Trading & fees"),
            catItem("API & integrations"),
            catItem("Compliance"),
            catItem("Troubleshooting"),
          ],
          {
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 12,
            paddingRight: 12,
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
          }
        ),
        col(70, [
          ...qa(
            "How do I open my first account?",
            "Sign up with an email, verify your identity, and connect a funding source. Most accounts are live within 5 minutes."
          ),
          ...qa(
            "What's the minimum deposit?",
            "$10 to start. There are no monthly minimums and no inactivity fees. You can scale up as your strategy grows."
          ),
          ...qa(
            "How does leverage work?",
            "Leverage lets you control a larger position with less capital. We offer up to 20x on majors, with auto-deleveraging before liquidation."
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "top" }
    ),
  ],
  {
    name: "Sidebar Categories FAQ",
    description: "Left category nav with a scrollable answer column on the right",
    category: "faq",
    slug: "faq-sidebar-categories",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
