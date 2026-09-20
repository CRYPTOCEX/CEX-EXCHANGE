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

const faqItem = (question: string, answer: string) =>
  el.card(
    {
      padding: 22,
      borderRadius: 14,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      marginBottom: 14,
    },
    [
      el.heading(question, {
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: "-0.01em",
        marginBottom: 8,
        color: theme.text,
      }),
      el.text(answer, {
        fontSize: 15,
        lineHeight: "1.6",
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

const formField = (label: string, placeholder: string) =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 0,
      marginBottom: 14,
    },
    [
      el.text(label, {
        fontSize: 13,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 6,
        paddingTop: 12,
        paddingLeft: 16,
        paddingRight: 16,
      }),
      el.text(placeholder, {
        fontSize: 15,
        color: theme.textDim,
        marginBottom: 0,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 14,
      }),
    ]
  );

export const contactFaqPlusContact: Section = section(
  [
    singleColumnRow([
      el.text("ANSWERS FIRST", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Most questions have a quick answer. Some do not.", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 56,
        maxWidth: "820px",
      }),
    ]),
    row(
      [
        col(55, [
          el.heading("Frequently asked", {
            fontSize: 22,
            fontWeight: "700",
            letterSpacing: "-0.01em",
            marginBottom: 20,
          }),
          faqItem(
            "How fast is order routing, actually?",
            "Orders are matched by our own engine rather than handed to a third-party venue, so execution is ours to control and to improve."
          ),
          faqItem(
            "Can I connect my own trading systems?",
            "Yes — a signed REST and WebSocket API with per-key rate limits, IP allow-listing and the common algorithmic trading clients supported out of the box."
          ),
          faqItem(
            "What are the institutional fee tiers?",
            "Taker fees start at 4bps and scale down to 0bps at $1B monthly notional. Maker rebates begin at tier two. A public schedule lives on /pricing."
          ),
        ]),
        col(45, [
          el.card(
            {
              padding: 32,
              borderRadius: 22,
              backgroundColor: theme.bgSubtle,
              borderColor: theme.border,
              borderWidth: 1,
            },
            [
              el.heading("Still need a human?", {
                fontSize: 22,
                fontWeight: "700",
                letterSpacing: "-0.01em",
                marginBottom: 8,
              }),
              el.text(
                "Send us the specifics and we will route it to the right desk within one business day.",
                {
                  fontSize: 15,
                  color: theme.textMuted,
                  marginBottom: 24,
                }
              ),
              formField("Your name", "Maya Chen"),
              formField("Work email", "maya@yourdesk.com"),
              formField(
                "What is your question?",
                "We are curious about institutional API access for…"
              ),
              el.button("Send to our team", "#send", {
                fontSize: 15,
                width: "100%",
                marginTop: 8,
              }),
            ]
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 40, verticalAlign: "top" }
    ),
  ],
  {
    name: "FAQ Plus Contact",
    description: "Short FAQ on the left, contact form on the right",
    category: "contact",
    slug: "contact-faq-plus-contact",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
