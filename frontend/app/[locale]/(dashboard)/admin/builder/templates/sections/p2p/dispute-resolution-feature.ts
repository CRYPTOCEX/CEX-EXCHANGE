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

const timelineEntry = (
  icon: string,
  title: string,
  body: string,
  accent: string
) =>
  row(
    [
      col(
        10,
        [el.icon(icon, { size: 20, color: accent, marginBottom: 0 })],
        {
          backgroundColor: theme.primarySoft,
          borderRadius: 999,
          paddingTop: 14,
          paddingBottom: 14,
          width: "48px",
          maxWidth: "48px",
          textAlign: "center",
        }
      ),
      col(90, [
        el.heading(title, {
          level: "h4",
          fontSize: 16,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 6,
        }),
        el.text(body, {
          fontSize: 14,
          color: theme.textMuted,
          lineHeight: "1.6",
          marginBottom: 0,
        }),
      ]),
    ],
    {
      maxWidth: "100%",
      gutter: 16,
      marginBottom: 20,
      verticalAlign: "top",
      paddingTop: 0,
      paddingBottom: 0,
    }
  );

export const p2pDisputeResolutionFeature: Section = section(
  [
    row(
      [
        col(50, [
          el.text("DISPUTE RESOLUTION", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.rose,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("A human-led team has your back", {
            level: "h2",
            fontSize: 44,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }),
          el.text(
            "Every dispute is handled by trained specialists. Average resolution time: 43 minutes. 98.7% of trades never reach disputes in the first place.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.6",
            }
          ),
          el.button("Read the dispute policy", "/p2p/disputes", {
            backgroundColor: theme.cssPrimary,
            color: theme.cssPrimaryInk,
            marginRight: 12,
          }),
          el.button("Contact support", "/support", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            marginRight: 0,
          }),
        ]),
        col(
          50,
          [
            timelineEntry(
              "lucide:flag",
              "1. Open a dispute",
              "Either party can flag the trade if payment or release is delayed. Escrow stays locked.",
              theme.amber
            ) as any,
            timelineEntry(
              "lucide:messages-square",
              "2. Submit evidence",
              "Upload receipts, chat logs, and bank statements. Our system scans for fraud signals.",
              theme.sky
            ) as any,
            timelineEntry(
              "lucide:user-check",
              "3. Specialist reviews",
              "A trained mediator reviews the case within 1 hour and asks for clarification if needed.",
              theme.violet
            ) as any,
            timelineEntry(
              "lucide:scale",
              "4. Fair ruling",
              "Based on evidence, escrow is released to the rightful party. Both sides get a written decision.",
              theme.emerald
            ) as any,
          ],
          {
            backgroundColor: theme.bgCard,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            borderRadius: 20,
            paddingTop: 32,
            paddingBottom: 32,
            paddingLeft: 32,
            paddingRight: 32,
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "top" }
    ),
  ],
  {
    name: "Dispute Resolution Feature",
    description: "Split layout with dispute process timeline and CTAs",
    category: "p2p",
    slug: "p2p-dispute-resolution-feature",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
