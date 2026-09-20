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

const officeCard = (
  city: string,
  tag: string,
  address: string[],
  phone: string,
  hours: string
) =>
  el.card(
    {
      padding: 32,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      height: "100%",
    },
    [
      el.text(tag, {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.16em",
        marginBottom: 10,
      }),
      el.heading(city, {
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: "-0.02em",
        marginBottom: 20,
        color: theme.text,
      }),
      el.divider({ marginTop: 0, marginBottom: 20, borderColor: theme.border }),
      el.text("ADDRESS", {
        fontSize: 11,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 6,
      }),
      ...address.map((line, i) =>
        el.text(line, {
          fontSize: 15,
          color: theme.text,
          marginBottom: i === address.length - 1 ? 18 : 2,
          lineHeight: "1.5",
        })
      ),
      el.text("PHONE", {
        fontSize: 11,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 6,
      }),
      el.text(phone, {
        fontSize: 15,
        color: theme.text,
        marginBottom: 18,
        fontWeight: "600",
      }),
      el.text("HOURS", {
        fontSize: 11,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 6,
      }),
      el.text(hours, {
        fontSize: 15,
        color: theme.text,
        marginBottom: 0,
      }),
    ]
  );

export const contactMultiOffice: Section = section(
  [
    singleColumnRow([
      el.text("GLOBAL OFFICES", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Three offices, one team", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Whichever timezone you are in, one of us is already at a keyboard.",
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
        col(33.33, [
          officeCard(
            "Singapore",
            "HEADQUARTERS",
            ["38 Beach Road, #29-11", "South Beach Tower", "Singapore 189767"],
            "+65 6817 4402",
            "Mon – Fri · 09:00 – 19:00 SGT"
          ),
        ]),
        col(33.33, [
          officeCard(
            "Zurich",
            "ENGINEERING",
            ["Talstrasse 62", "8001 Zürich", "Switzerland"],
            "+41 44 586 2130",
            "Mon – Fri · 09:00 – 18:00 CET"
          ),
        ]),
        col(33.33, [
          officeCard(
            "Brooklyn",
            "OPERATIONS",
            ["68 Jay Street, Suite 410", "Brooklyn, NY 11201", "United States"],
            "+1 (917) 555-0142",
            "Mon – Sun · 24 hours"
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Multi-Office",
    description: "Three office cards with address, phone, and hours",
    category: "contact",
    slug: "contact-multi-office",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
