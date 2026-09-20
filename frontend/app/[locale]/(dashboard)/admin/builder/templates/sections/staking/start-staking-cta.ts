import type { Section } from "@/types/builder";
import {
  el,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
} from "../../utils";

export const stakingStartStakingCta: Section = section(
  [
    singleColumnRow([
      el.text("START EARNING", {
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
      el.heading("Your idle crypto is leaving money on the table", {
        level: "h2",
        fontSize: 60,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        textAlign: "center",
        lineHeight: "1.05",
        color: theme.onBand,
        marginBottom: 20,
        maxWidth: "820px",
      }),
      el.text(
        "Up to 11.8% APY on the assets already in your wallet. No lock-ins you didn't opt into. Takes under a minute to get started.",
        {
          fontSize: 20,
          textAlign: "center",
          lineHeight: "1.6",
          color: theme.onBandMuted,
          maxWidth: "640px",
          marginBottom: 44,
        }
      ),
      el.button("Start staking now", "/staking/start", {
        backgroundColor: theme.onBandSurface,
        color: theme.onBandSurfaceInk,
        fontSize: 17,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 32,
        paddingRight: 32,
      }),
      el.button("View live APY", "/staking/rates", {
        backgroundColor: theme.onBandFill,
        color: theme.onBand,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.onBandBorder,
        fontSize: 17,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 32,
        paddingRight: 32,
      }),
    ]),
  ],
  {
    name: "Start Staking CTA",
    description: "Clean full-bleed CTA section pushing staking signup",
    category: "staking",
    slug: "staking-start-staking-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.skyEmerald,
    },
  }
);
