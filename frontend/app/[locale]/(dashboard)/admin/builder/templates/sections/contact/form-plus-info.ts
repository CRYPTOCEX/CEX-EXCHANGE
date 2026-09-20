import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const formField = (label: string, placeholder: string) =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 0,
      marginBottom: 16,
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

const infoRow = (iconName: string, label: string, value: string) =>
  el.card(
    {
      padding: 20,
      borderRadius: 14,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      gap: 16,
    },
    [
      el.icon(iconName, {
        size: 22,
        color: theme.primary,
        marginBottom: 0,
        marginRight: 16,
      }),
      el.text(label, {
        fontSize: 12,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.12em",
        marginBottom: 2,
      }),
      el.text(value, {
        fontSize: 16,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 0,
      }),
    ]
  );

export const contactFormPlusInfo: Section = section(
  [
    row(
      [
        col(50, [
          el.text("GET IN TOUCH", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("Let us know what you are trading", {
            fontSize: 42,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
            marginBottom: 16,
          }),
          el.text(
            "We read every message within one business day and route it to the right desk. For urgent trading support, use the live-chat button below.",
            { fontSize: 17, marginBottom: 32 }
          ),
          formField("Full name", "Maya Chen"),
          formField("Work email", "maya@yourdesk.com"),
          formField("Firm", "Meridian Capital"),
          formField("How can we help?", "I am evaluating options for our Asia book…"),
          el.button("Send message", "#send", {
            fontSize: 16,
            width: "100%",
            marginTop: 8,
          }),
        ]),
        col(50, [
          el.heading("Or reach the right desk directly", {
            fontSize: 22,
            fontWeight: "700",
            letterSpacing: "-0.01em",
            marginBottom: 20,
          }),
          infoRow("mail", "GENERAL", "hello@company.com"),
          infoRow("headphones", "TRADING SUPPORT", "desk@company.com"),
          infoRow("briefcase", "INSTITUTIONAL SALES", "sales@company.com"),
          infoRow("shield", "SECURITY", "security@company.com"),
          infoRow("phone", "PHONE (24/7)", "+1 (917) 555-0142"),
          infoRow("map-pin", "HEADQUARTERS", "38 Beach Road, Singapore"),
        ]),
      ],
      { ...rowPresets.contained, gutter: 56, verticalAlign: "top" }
    ),
  ],
  {
    name: "Form Plus Info",
    description: "50/50 split of contact form and direct contact info",
    category: "contact",
    slug: "contact-form-plus-info",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
