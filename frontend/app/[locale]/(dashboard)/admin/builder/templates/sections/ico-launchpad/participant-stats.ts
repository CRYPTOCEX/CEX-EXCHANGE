import type { Section, Element } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

const statBlock = (value: string, label: string): Element[] => [
  el.heading(value, {
    level: "h3",
    fontSize: 64,
    fontWeight: "800",
    letterSpacing: "-0.03em",
    textAlign: "center",
    color: theme.onBand,
    marginBottom: 12,
  }),
  el.text(label, {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: "0.18em",
    textAlign: "center",
    color: theme.onBandMuted,
    marginBottom: 0,
  }),
];

export const icoLaunchpadParticipantStats: Section = section(
  [
    singleColumnRow([
      el.text("PARTICIPANTS", {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.onBand,
        backgroundColor: theme.onBandFill,
        borderRadius: 999,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: 32,
        maxWidth: "180px",
      }),
      el.heading("Backed by a global community", {
        level: "h2",
        fontSize: 60,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        textAlign: "center",
        lineHeight: "1.05",
        color: theme.onBand,
        marginBottom: 20,
        maxWidth: "780px",
      }),
      el.text(
        "Across every round on the launchpad — the numbers are updated the moment a new participant clears KYC.",
        {
          fontSize: 19,
          textAlign: "center",
          lineHeight: "1.6",
          color: theme.onBandMuted,
          maxWidth: "620px",
          marginBottom: 72,
        }
      ),
    ]),
    row(
      [
        col(33, statBlock("50K+", "PARTICIPANTS")),
        col(33, statBlock("$24M", "TOTAL RAISED")),
        col(34, statBlock("112", "COUNTRIES")),
      ],
      { ...rowPresets.wide, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Participant Stats",
    description: "Three headline launchpad stats — participants, raised, countries",
    category: "ico-launchpad",
    slug: "ico-launchpad-participant-stats",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: gradients.aurora,
    },
  }
);
