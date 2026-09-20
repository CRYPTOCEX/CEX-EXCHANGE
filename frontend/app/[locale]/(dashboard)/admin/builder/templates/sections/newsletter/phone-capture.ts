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

export const newsletterPhoneCapture: Section = section(
  [
    singleColumnRow([
      el.icon("lucide:message-square", {
        size: 32,
        color: theme.primary,
        backgroundColor: theme.primarySoft,
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        marginLeft: "auto",
        marginRight: "auto",
      }),
      el.heading("Price alerts by text", {
        level: "h2",
        fontSize: 38,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "The moment a market moves, we'll text you. No app install, no email clutter — just a short SMS with the number that matters.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "540px",
          marginBottom: 32,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(20, [
          el.text("+1 (US)", {
            fontSize: 15,
            color: theme.text,
            backgroundColor: theme.bgCard,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            borderRadius: 10,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 16,
            paddingRight: 16,
            marginBottom: 0,
            textAlign: "center",
          }),
        ]),
        col(50, [
          el.text("(555) 123-4567", {
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
          el.button("Text me alerts", "#", {
            width: "100%",
            marginTop: 0,
            marginRight: 0,
            textAlign: "center",
          }),
        ]),
      ],
      { ...rowPresets.narrow, gutter: 10, maxWidth: "620px" }
    ),
    singleColumnRow([
      el.text("Msg & data rates may apply. Reply STOP to unsubscribe.", {
        fontSize: 12,
        textAlign: "center",
        color: theme.textDim,
        marginTop: 16,
        marginBottom: 0,
      }),
    ]),
  ],
  {
    name: "Phone Capture Newsletter",
    description: "SMS signup variant with country selector, phone input, and CTA",
    category: "newsletter",
    slug: "newsletter-phone-capture",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
