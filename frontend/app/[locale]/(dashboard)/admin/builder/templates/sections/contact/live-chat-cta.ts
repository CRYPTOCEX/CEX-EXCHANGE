import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

const chatBubble = (
  text: string,
  author: string,
  align: "left" | "right" = "left"
) =>
  el.card(
    {
      padding: 18,
      borderRadius: 16,
      backgroundColor:
        align === "right" ? theme.primary : theme.bgCard,
      borderWidth: align === "right" ? 0 : 1,
      borderColor: theme.border,
      marginBottom: 16,
      marginLeft: align === "right" ? 40 : 0,
      marginRight: align === "right" ? 0 : 40,
      maxWidth: "80%",
      width: "fit-content",
      alignSelf: align === "right" ? "flex-end" : "flex-start",
    },
    [
      el.text(author, {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.08em",
        marginBottom: 6,
        color:
          align === "right"
            ? theme.onBandMuted
            : theme.textMuted,
      }),
      el.text(text, {
        fontSize: 15,
        lineHeight: "1.5",
        marginBottom: 0,
        color: align === "right" ? theme.primaryText : theme.text,
      }),
    ]
  );

export const contactLiveChatCta: Section = section(
  [
    row(
      [
        col(55, [
          el.text("LIVE SUPPORT", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("Talk to our team, right now.", {
            fontSize: 52,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            marginBottom: 20,
          }),
          el.text(
            "Average first-response time on live chat is seventy-three seconds. You will talk to a real engineer, not a bot, and not a tier-one handler reading a script.",
            { fontSize: 18, marginBottom: 32 }
          ),
          el.card(
            {
              padding: 18,
              borderRadius: 14,
              backgroundColor: theme.bgMuted,
              borderWidth: 0,
              marginBottom: 32,
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "fit-content",
            },
            [
              el.icon("circle-dot", {
                size: 14,
                color: theme.emerald,
                marginBottom: 0,
                marginRight: 10,
              }),
              el.text("4 engineers online now", {
                fontSize: 14,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 0,
              }),
            ]
          ),
          el.button("Start a conversation", "#chat", {
            fontSize: 16,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 32,
            paddingRight: 32,
          }),
          el.button("Or email us", "mailto:hello@company.com", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            fontSize: 16,
          }),
        ]),
        col(45, [
          el.card(
            {
              padding: 28,
              borderRadius: 24,
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              borderWidth: 1,
              boxShadowX: 0,
              boxShadowY: 24,
              boxShadowBlur: 56,
              boxShadowSpread: -16,
              boxShadowColor: "rgba(10,18,32,0.1)",
            },
            [
              el.card(
                {
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: theme.bgMuted,
                  borderWidth: 0,
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                },
                [
                  el.image(
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
                    "Support engineer Priya Desai",
                    {
                      width: "40px",
                      height: "40px",
                      borderRadius: 999,
                      marginBottom: 0,
                      marginRight: 12,
                      objectFit: "cover",
                    }
                  ),
                  el.text("Priya Desai · Staff Engineer", {
                    fontSize: 13,
                    fontWeight: "700",
                    color: theme.text,
                    marginBottom: 2,
                  }),
                  el.text("Typically replies in under a minute", {
                    fontSize: 12,
                    color: theme.emerald,
                    marginBottom: 0,
                  }),
                ]
              ),
              chatBubble(
                "Hey Priya, our FIX session dropped for 40s this morning around 09:14 SGT. Can you take a look?",
                "YOU",
                "right"
              ),
              chatBubble(
                "On it — opening the session logs now. Give me 30 seconds.",
                "PRIYA",
                "left"
              ),
              chatBubble(
                "Found it. We had a transient network hiccup in SG1, auto-failover kicked in after 38s. I will send you the incident note in a minute.",
                "PRIYA",
                "left"
              ),
            ]
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 48, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Live Chat CTA",
    description: "Talk to our team with chat-bubble illustration and CTA",
    category: "contact",
    slug: "contact-live-chat-cta",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
