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

const listItem = (name: string, title: string) =>
  el.card(
    {
      padding: 0,
      borderWidth: 0,
      backgroundColor: "transparent",
      paddingTop: 18,
      paddingBottom: 18,
      borderBottom: true,
      borderColor: theme.border,
      borderRadius: 0,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    [
      el.text(name, {
        fontSize: 20,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 0,
        letterSpacing: "-0.01em",
      }),
      el.text(title, {
        fontSize: 15,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const teamMinimalList: Section = section(
  [
    singleColumnRow([
      el.text("DIRECTORY", {
        fontSize: 13,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Every teammate, in one list", {
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Names and titles only. Photos live on the team page; this is the printable version.",
        {
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(50, [
          listItem("Maya Chen", "Co-founder & CEO"),
          listItem("Jordan Park", "Co-founder & COO"),
          listItem("Samir Patel", "VP Product"),
          listItem("Priya Desai", "VP Engineering"),
          listItem("Marcus Okafor", "Head of Markets"),
          listItem("Elena Rossi", "Head of Design"),
          listItem("Daniel Weiss", "Chief Risk Officer"),
          listItem("Amara Nwosu", "Head of Compliance"),
          listItem("Theo Lambert", "Head of Talent"),
          listItem("Naomi Ito", "Staff Engineer, Matching"),
        ]),
        col(50, [
          listItem("Ben Haddad", "Staff Engineer, Risk"),
          listItem("Sara Lin", "Staff Engineer, Platform"),
          listItem("Marcus Ahn", "Principal Product Manager"),
          listItem("Iris Okonkwo", "Senior Product Designer"),
          listItem("Leo Navarro", "Senior Brand Designer"),
          listItem("Rhea Menon", "Senior Market Analyst"),
          listItem("Kai Ostrander", "Head of Institutional Sales"),
          listItem("Chiara Bianchi", "Customer Success Lead"),
          listItem("Noor Rahman", "Finance Controller"),
          listItem("Felix Duarte", "General Counsel"),
        ]),
      ],
      { ...rowPresets.contained, gutter: 56, verticalAlign: "top" }
    ),
  ],
  {
    name: "Minimal Team List",
    description: "Two-column text-only team list with titles",
    category: "team",
    slug: "team-minimal-list",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
