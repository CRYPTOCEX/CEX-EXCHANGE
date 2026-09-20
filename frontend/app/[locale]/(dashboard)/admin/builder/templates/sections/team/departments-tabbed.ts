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

const deptMember = (photo: string, alt: string, name: string, title: string) =>
  el.card(
    {
      padding: 0,
      borderRadius: 18,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      overflow: "hidden",
    },
    [
      el.image(photo, alt, {
        width: "100%",
        height: "280px",
        objectFit: "cover",
        borderRadius: 0,
        marginBottom: 0,
      }),
      el.text(name, {
        fontSize: 17,
        fontWeight: "700",
        color: theme.text,
        marginTop: 20,
        marginBottom: 4,
        paddingLeft: 22,
        paddingRight: 22,
      }),
      el.text(title, {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: 22,
        paddingLeft: 22,
        paddingRight: 22,
      }),
    ]
  );

export const teamDepartmentsTabbed: Section = section(
  [
    singleColumnRow([
      el.text("BY DEPARTMENT", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Every team, every function", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 32,
      }),
    ]),
    singleColumnRow(
      [
        deptPill("Engineering", true),
        deptPill("Product"),
        deptPill("Design"),
        deptPill("Markets"),
        deptPill("Risk & Compliance"),
        deptPill("People"),
      ],
      { ...rowPresets.contained, paddingBottom: 48, textAlign: "center" }
    ),
    row(
      [
        col(25, [
          deptMember(
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=80",
            "Portrait of Priya Desai",
            "Priya Desai",
            "VP Engineering"
          ),
        ]),
        col(25, [
          deptMember(
            "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80",
            "Portrait of Theo Lambert",
            "Theo Lambert",
            "Principal Engineer"
          ),
        ]),
        col(25, [
          deptMember(
            "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=500&q=80",
            "Portrait of Naomi Ito",
            "Naomi Ito",
            "Staff Engineer, Matching"
          ),
        ]),
        col(25, [
          deptMember(
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80",
            "Portrait of Ben Haddad",
            "Ben Haddad",
            "Staff Engineer, Risk"
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 20 }
    ),
  ],
  {
    name: "Departments Tabbed",
    description: "Department pills above a filterable team grid",
    category: "team",
    slug: "team-departments-tabbed",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
