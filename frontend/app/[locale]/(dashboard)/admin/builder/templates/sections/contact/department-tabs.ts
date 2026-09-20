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

const deptPill = (label: string, active = false) =>
  el.button(label, "#", {
    backgroundColor: active ? theme.primary : theme.bgCard,
    color: active ? theme.primaryText : theme.text,
    borderColor: active ? theme.primary : theme.border,
    borderWidth: 1,
    borderRadius: 999,
    fontSize: 14,
    fontWeight: "600",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    marginRight: 10,
    marginTop: 0,
  });

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

export const contactDepartmentTabs: Section = section(
  [
    singleColumnRow([
      el.text("ROUTE YOUR MESSAGE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Pick a desk, then write", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Choosing the right department gets your message in front of the right human a day sooner.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 40,
        }
      ),
    ]),
    singleColumnRow(
      [
        deptPill("General", true),
        deptPill("Trading support"),
        deptPill("Institutional sales"),
        deptPill("Press"),
        deptPill("Partnerships"),
        deptPill("Careers"),
      ],
      { ...rowPresets.contained, paddingBottom: 48, textAlign: "center" }
    ),
    row(
      [
        col(15, []),
        col(70, [
          el.card(
            {
              padding: 40,
              borderRadius: 22,
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              borderWidth: 1,
            },
            [
              formField("Full name", "Maya Chen"),
              formField("Work email", "maya@yourdesk.com"),
              formField("Subject", "Onboarding the Asia book"),
              formField(
                "Your message",
                "We are evaluating venues for our Asia derivatives flow and would like to talk about institutional onboarding…"
              ),
              el.button("Send to general desk", "#send", {
                fontSize: 16,
                width: "100%",
                marginTop: 8,
              }),
            ]
          ),
        ]),
        col(15, []),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
  ],
  {
    name: "Department Tabs",
    description: "Department pills with a single contact form below",
    category: "contact",
    slug: "contact-department-tabs",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
