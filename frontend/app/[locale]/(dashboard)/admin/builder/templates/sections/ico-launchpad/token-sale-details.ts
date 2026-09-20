import type { Section, Element, Column, Row } from "@/types/builder";
import { generateId } from "@/store/builder-store";
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

const detailRow = (label: string, value: string): Element[] => [
  el.text(
    `<span style="display:inline-block;width:50%;opacity:0.75">${label}</span><span style="display:inline-block;width:50%;text-align:right;font-weight:700;color:currentColor">${value}</span>`,
    {
      fontSize: 14,
      color: theme.text,
      marginBottom: 0,
      lineHeight: "1.5",
    }
  ),
  el.divider({ marginTop: 16, marginBottom: 16, borderColor: theme.border }),
];

const vestingBlock = (phase: string, detail: string): Element[] => [
  el.text(phase, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.16em",
    color: theme.primary,
    marginBottom: 8,
  }),
  el.text(detail, {
    fontSize: 14,
    lineHeight: "1.6",
    color: theme.text,
    marginBottom: 0,
  }),
];

const vestingCardSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 14,
  padding: 20,
};

export const icoLaunchpadTokenSaleDetails: Section = section(
  [
    singleColumnRow([
      el.text("SALE DETAILS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.heading("Tokenomics, price, and vesting", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Full disclosure on every parameter that shapes ORBT supply and investor protection.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(
          50,
          [
            el.heading("Sale summary", {
              level: "h3",
              fontSize: 22,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 24,
              letterSpacing: "-0.01em",
            }),
            ...detailRow("Token symbol", "ORBT"),
            ...detailRow("Total supply", "1,000,000,000"),
            ...detailRow("Sale price", "$0.042 / ORBT"),
            ...detailRow("Raise target", "$4,500,000"),
            ...detailRow("Accepted assets", "USDC, ETH"),
            ...detailRow("Blockchain", "Base (L2)"),
            ...detailRow("Minimum / maximum", "$100 / $25,000"),
          ],
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 20,
            paddingTop: 36,
            paddingBottom: 20,
            paddingLeft: 36,
            paddingRight: 36,
          }
        ),
        colR(50, [
          el.heading("Vesting schedule", {
            level: "h3",
            fontSize: 22,
            fontWeight: "700",
            color: theme.text,
            marginBottom: 24,
            letterSpacing: "-0.01em",
          }),
        ], [
          row(
            [
              col(
                50,
                vestingBlock("TGE UNLOCK", "20% of tokens released at generation event."),
                vestingCardSettings
              ),
              col(
                50,
                vestingBlock("CLIFF", "3-month cliff before further unlocks begin."),
                vestingCardSettings
              ),
            ],
            { gutter: 16, marginBottom: 16, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(
                50,
                vestingBlock("LINEAR", "Remaining 80% vests monthly over 12 months."),
                vestingCardSettings
              ),
              col(
                50,
                vestingBlock("TEAM LOCK", "Core team locked 24 months post-TGE."),
                vestingCardSettings
              ),
            ],
            { gutter: 16, marginBottom: 16, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(100, [
                el.text(
                  "Vesting handled by an audited smart contract — tokens release on-chain without any manual action.",
                  {
                    fontSize: 14,
                    lineHeight: "1.6",
                    color: theme.textMuted,
                    marginBottom: 0,
                  }
                ),
              ]),
            ],
            { gutter: 0, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "top" }
    ),
  ],
  {
    name: "Token Sale Details",
    description: "Tokenomics breakdown, sale price, and vesting schedule",
    category: "ico-launchpad",
    slug: "ico-launchpad-token-sale-details",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
