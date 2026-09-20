import type { Section, Element, ColorValue } from "@/types/builder";
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

const colorFromValue = (v: ColorValue): string => {
  if (typeof v === "string") return v;
  if ("gradient" in v) return v.gradient.from;
  return v.light;
};

const legendRow = (
  label: string,
  percent: string,
  detail: string,
  dotColor: ColorValue
): Element[] => [
  el.text(
    `<span style="display:inline-block;width:8%;vertical-align:top"><span style="display:inline-block;width:16px;height:16px;border-radius:999px;background:${colorFromValue(dotColor)};margin-top:6px"></span></span><span style="display:inline-block;width:60%;vertical-align:top"><span style="display:block;font-size:15px;font-weight:700;color:currentColor;margin-bottom:2px">${label}</span><span style="display:block;font-size:12px;opacity:0.7">${detail}</span></span><span style="display:inline-block;width:32%;vertical-align:top;text-align:right;font-size:18px;font-weight:800;letter-spacing:-0.01em">${percent}</span>`,
    {
      fontSize: 14,
      color: theme.text,
      marginBottom: 0,
      lineHeight: "1.5",
    }
  ),
  el.divider({ marginTop: 16, marginBottom: 16, borderColor: theme.border }),
];

export const icoLaunchpadTokenomicsBreakdown: Section = section(
  [
    singleColumnRow([
      el.text("TOKENOMICS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.heading("How the 1B ORBT supply is allocated", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Allocation locked into smart contracts at TGE. Vesting schedules apply across every non-public bucket.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(
          45,
          [
            el.image(
              "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&q=80",
              "Tokenomics allocation visual — abstract 3d-render pie breakdown",
              {
                borderRadius: 20,
                boxShadowX: 0,
                boxShadowY: 24,
                boxShadowBlur: 48,
                boxShadowColor: "rgba(10,18,32,0.12)",
              }
            ),
          ]
        ),
        col(
          55,
          [
            ...legendRow("Public sale", "40%", "400M ORBT · 20% TGE, 12mo linear", theme.primary),
            ...legendRow("Ecosystem & rewards", "25%", "250M ORBT · 36mo linear", theme.emerald),
            ...legendRow("Team & founders", "15%", "150M ORBT · 24mo lock + 24mo vest", theme.violet),
            ...legendRow("Treasury", "12%", "120M ORBT · multisig-governed", theme.sky),
            ...legendRow("Advisors", "5%", "50M ORBT · 12mo cliff, 24mo vest", theme.amber),
            ...legendRow("Liquidity", "3%", "30M ORBT · bootstrapped on Uniswap v4", theme.rose),
          ],
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 20,
            paddingTop: 32,
            paddingBottom: 16,
            paddingLeft: 32,
            paddingRight: 32,
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Tokenomics Breakdown",
    description: "Allocation visual with itemised percentage legend",
    category: "ico-launchpad",
    slug: "ico-launchpad-tokenomics-breakdown",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
