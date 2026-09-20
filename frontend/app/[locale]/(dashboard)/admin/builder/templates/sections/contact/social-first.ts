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

const socialCard = (
  iconName: string,
  channel: string,
  handle: string,
  blurb: string,
  accent: string
) =>
  el.card(
    {
      padding: 36,
      borderRadius: 22,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      height: "100%",
      transitionProperty: "transform, box-shadow",
      transitionDuration: 200,
      cursor: "pointer",
    },
    [
      el.card(
        {
          width: "64px",
          height: "64px",
          borderRadius: 18,
          backgroundColor: accent,
          borderWidth: 0,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        },
        [
          el.icon(iconName, {
            size: 28,
            color: theme.onBand,
            marginBottom: 0,
          }),
        ]
      ),
      el.heading(channel, {
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: "-0.02em",
        marginBottom: 6,
        color: theme.text,
      }),
      el.text(handle, {
        fontSize: 15,
        fontWeight: "600",
        color: theme.primary,
        marginBottom: 16,
      }),
      el.text(blurb, {
        fontSize: 15,
        lineHeight: "1.65",
        color: theme.textMuted,
        marginBottom: 20,
      }),
      el.link("Open channel →", "#", {
        fontSize: 14,
        fontWeight: "600",
        color: theme.text,
      }),
    ]
  );

export const contactSocialFirst: Section = section(
  [
    singleColumnRow([
      el.text("WHERE WE HANG OUT", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Pick the channel that fits your question", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
        maxWidth: "760px",
      }),
      el.text(
        "Quick takes on Twitter, deep dives on Discord, alerts on Telegram, and serious threads over email.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(25, [
          socialCard(
            "twitter",
            "Twitter",
            "@company",
            "Market commentary, product updates, and the occasional joke that lands. Replies usually inside an hour.",
            theme.bandInk
          ),
        ]),
        col(25, [
          socialCard(
            "message-circle",
            "Discord",
            "/invite/company",
            "Eleven thousand traders, quants, and builders. Dedicated channels for API, risk, and market structure.",
            "#5865f2"
          ),
        ]),
        col(25, [
          socialCard(
            "send",
            "Telegram",
            "t.me/company",
            "Real-time status alerts and institutional announcements. Low volume, high signal. Never promotional.",
            "#229ed9"
          ),
        ]),
        col(25, [
          socialCard(
            "mail",
            "Email",
            "hello@company.com",
            "The slow lane. Best for detailed questions, RFPs, and anything that needs a real thread. Replied within a day.",
            theme.primary
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Social First",
    description: "Four big social-channel cards as primary contact options",
    category: "contact",
    slug: "contact-social-first",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
