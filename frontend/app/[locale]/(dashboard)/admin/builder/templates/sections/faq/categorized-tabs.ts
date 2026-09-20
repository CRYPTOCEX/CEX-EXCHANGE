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

const pill = (label: string, active = false) =>
  el.text(label, {
    fontSize: 14,
    fontWeight: "600",
    color: active ? theme.primaryText : theme.textMuted,
    backgroundColor: active ? theme.primary : theme.bgMuted,
    borderRadius: 999,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    marginRight: 8,
    marginBottom: 0,
    display: "inline-block",
  });

const faqItem = (question: string, answer: string) =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 24,
      marginBottom: 12,
    },
    [
      el.heading(question, {
        level: "h3",
        fontSize: 16,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 10,
      }),
      el.text(answer, {
        fontSize: 15,
        lineHeight: "1.65",
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const faqCategorizedTabs: Section = section(
  [
    singleColumnRow([
      el.heading("Help by topic", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "Browse answers by category. Pick a topic to jump straight to the questions that matter most.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 40,
          lineHeight: "1.6",
        }
      ),
    ]),
    singleColumnRow(
      [
        el.text(
          `${pill("Getting started", true).content}`,
          {
            textAlign: "center",
            marginBottom: 40,
          }
        ),
      ],
      { ...rowPresets.narrow }
    ),
    row(
      [
        col(
          100,
          [
            pill("Getting started", true),
            pill("Account", false),
            pill("Trading", false),
            pill("Fees", false),
            pill("Security", false),
            pill("API", false),
          ],
          { textAlign: "center", paddingBottom: 0 }
        ),
      ],
      { ...rowPresets.contained, marginBottom: 8 }
    ),
    singleColumnRow(
      [
        faqItem(
          "How do I open my first account?",
          "Click Sign up, enter your email, and verify your identity with a government ID. Most accounts are ready to trade in under 5 minutes."
        ),
        faqItem(
          "What's the minimum deposit?",
          "You can start with as little as $10. There are no monthly minimums or inactivity fees."
        ),
        faqItem(
          "Which countries do you support?",
          "We're live in 38 countries across North America, Europe, and Asia. Full list is in our onboarding flow."
        ),
        faqItem(
          "How do I enable two-factor authentication?",
          "Under Settings → Security, scan the QR with your authenticator app. We strongly recommend hardware keys for Pro accounts."
        ),
        faqItem(
          "Can I link multiple bank accounts?",
          "Yes, up to 5 funding sources per account. Each one is verified with a micro-deposit before it can be used."
        ),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Categorized Tabs FAQ",
    description: "Category pills above a focused FAQ list for the active topic",
    category: "faq",
    slug: "faq-categorized-tabs",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
