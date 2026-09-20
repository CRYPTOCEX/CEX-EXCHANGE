import type { Section } from "@/types/builder";
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

const bigDigit = (value: string, label: string) =>
  el.card(
    {
      backgroundColor: theme.onBandFill,
      borderColor: theme.onBandFill,
      borderWidth: 1,
      borderRadius: 18,
      padding: 36,
      textAlign: "center",
    },
    [
      el.heading(value, {
        level: "h3",
        fontSize: 72,
        fontWeight: "800",
        color: theme.onBand,
        letterSpacing: "-0.04em",
        lineHeight: "1",
        textAlign: "center",
        marginBottom: 14,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
      el.text(label, {
        fontSize: 12,
        fontWeight: "800",
        color: theme.onBandMuted,
        letterSpacing: "0.18em",
        textAlign: "center",
        marginBottom: 0,
      }),
    ]
  );

export const copyTradingLiveCopyingCounter: Section = section(
  [
    singleColumnRow([
      el.text(
        // The chip is a miniature band: a pinned dark `--success` ground with
        // pinned ink, so it reads the same over the pinned nightSky gradient in
        // both themes. A theme-following green here would drop to 4.0:1 in
        // light mode, where `--success` is tuned for light grounds.
        `<span style="display:inline-block;padding:4px 14px;border-radius:999px;background:${theme.bandSuccess};border:1px solid ${theme.onBandBorder};color:${theme.onBand};font-size:11px;font-weight:800;letter-spacing:0.16em;">● LIVE · UPDATED IN REAL TIME</span>`,
        {
          textAlign: "center",
          marginBottom: 24,
          fontSize: 11,
        }
      ),
      el.heading("Copy trades are happening right now", {
        textAlign: "center",
        fontSize: 56,
        fontWeight: "800",
        color: theme.onBand,
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        marginBottom: 18,
        maxWidth: "900px",
      }),
      el.text(
        "Every second, thousands of positions mirror across 180+ countries. These numbers reset at 00:00 UTC daily.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.onBandDim,
          maxWidth: "680px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(33.33, [bigDigit("242,847", "POSITIONS COPIED TODAY")]),
        col(33.33, [bigDigit("$184.2M", "COPY VOLUME TODAY")]),
        col(33.33, [bigDigit("38,124", "COPIERS ACTIVE NOW")]),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top", marginBottom: 48 }
    ),
    row(
      [
        col(100, [
          el.button("Join them — start copying", "/copy-trading", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 17,
            paddingLeft: 36,
            paddingRight: 36,
            paddingTop: 16,
            paddingBottom: 16,
            marginRight: 0,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Live Copying Counter",
    description: "Animated counter section showing live copy-trading activity",
    category: "copy-trading",
    slug: "copy-trading-live-copying-counter",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.nightSky,
    },
  }
);
