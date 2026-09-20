import type { Section, Element, Column, Row } from "@/types/builder";
import { generateId } from "@/store/builder-store";
import {
  el,
  row,
  col,
  section,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

const colR = (
  width: number,
  elements: Element[],
  rows: Row[],
  settings: Record<string, unknown> = {}
): Column => ({
  id: generateId("column"),
  width,
  elements,
  rows,
  settings: { paddingTop: 0, paddingBottom: 0, paddingLeft: 12, paddingRight: 12, ...settings },
  nestingLevel: 1,
});

const countBlock = (value: string, label: string): Element[] => [
  el.heading(value, {
    level: "h4",
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: "-0.03em",
    color: theme.onBand,
    marginBottom: 6,
    textAlign: "center",
  }),
  el.text(label, {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: "0.18em",
    textAlign: "center",
    color: theme.onBandDim,
    marginBottom: 0,
  }),
];

const blockSettings = {
  backgroundColor: theme.onBandFill,
  borderColor: theme.onBandBorder,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 14,
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 12,
  paddingRight: 12,
};

export const icoLaunchpadActiveSaleCountdown: Section = section(
  [
    row(
      [
        colR(
          55,
          [
            el.text("LIVE SALE — ROUND 2", {
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: "0.18em",
              color: theme.onBand,
              // Decorative "live" tint, not ink: rgb(14,159,111) is `--success`
              // (light) at 22% alpha, i.e. already an alpha cut of a token. It
              // stays literal because it has to be pinned — the pill sits on the
              // aurora band, which does not fork with the theme — and because
              // `theme.onBandFill` would flatten the one green signal in the
              // section. The ink over it is `onBand`, so contrast is unaffected.
              backgroundColor: "rgba(14,159,111,0.22)",
              borderRadius: 999,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 16,
              paddingRight: 16,
              marginBottom: 24,
              maxWidth: "220px",
            }),
            el.heading("Orbit Compute — ORBT", {
              level: "h1",
              fontSize: 44,
              fontWeight: "800",
              letterSpacing: "-0.025em",
              lineHeight: "1.05",
              color: theme.onBand,
              marginBottom: 8,
            }),
            el.text("Decentralised GPU compute · Base", {
              fontSize: 14,
              color: theme.onBandMuted,
              marginBottom: 28,
            }),
            el.text(
              "Raising $4.5M to power the first permissionless GPU marketplace. Round 2 allocates 8% of supply at $0.042 / ORBT.",
              {
                fontSize: 17,
                lineHeight: "1.65",
                color: theme.onBandMuted,
                marginBottom: 32,
                maxWidth: "520px",
              }
            ),
          ],
          [
            row(
              [
                col(25, countBlock("01", "DAYS"), blockSettings),
                col(25, countBlock("14", "HOURS"), blockSettings),
                col(25, countBlock("32", "MIN"), blockSettings),
                col(25, countBlock("58", "SEC"), blockSettings),
              ],
              { gutter: 12, marginBottom: 32, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
            ),
            row(
              [
                col(100, [
                  el.text("RAISED SO FAR · $3,240,880 of $4,500,000", {
                    fontSize: 13,
                    fontWeight: "700",
                    letterSpacing: "0.14em",
                    color: theme.onBandMuted,
                    marginBottom: 12,
                  }),
                  el.text(
                    `<span style="display:block;width:100%;height:12px;background:${theme.onBandBorder};border-radius:999px;overflow:hidden"><span style="display:block;width:72%;height:100%;background:${theme.onBand};border-radius:999px"></span></span>`,
                    {
                      fontSize: 1,
                      color: theme.onBand,
                      marginBottom: 28,
                    }
                  ),
                  el.button("Participate now", "/launchpad/orbit-compute/participate", {
                    backgroundColor: theme.onBandSurface,
                    color: theme.onBandSurfaceInk,
                    fontSize: 16,
                  }),
                  el.button("Read whitepaper", "/launchpad/orbit-compute/whitepaper", {
                    backgroundColor: theme.onBandFill,
                    color: theme.onBand,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: theme.onBandBorder,
                    fontSize: 16,
                  }),
                ]),
              ],
              { gutter: 0, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
            ),
          ]
        ),
        col(45, [
          el.image(
            "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&q=80",
            "Orbit Compute — abstract 3d-render of distributed GPU nodes",
            {
              borderRadius: 24,
              boxShadowX: 0,
              boxShadowY: 32,
              boxShadowBlur: 64,
              // `theme.bandInk` at 40% alpha. Stays literal: it lands in a
              // `box-shadow` shorthand and the vocabulary has no shadow colour.
              boxShadowColor: "rgba(10,18,32,0.4)",
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Active Sale Countdown",
    description: "Live ICO sale hero with project logo, countdown, and progress bar",
    category: "ico-launchpad",
    slug: "ico-launchpad-active-sale-countdown",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: gradients.aurora,
    },
  }
);
