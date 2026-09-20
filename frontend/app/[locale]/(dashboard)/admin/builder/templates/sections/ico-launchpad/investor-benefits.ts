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

const benefit = (
  icon: string,
  title: string,
  body: string,
  accent: ColorValue
): Element[] => [
  el.icon(icon, {
    size: 36,
    color: accent,
    marginBottom: 24,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 12,
    letterSpacing: "-0.01em",
  }),
  el.text(body, {
    fontSize: 15,
    lineHeight: "1.65",
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

const benefitSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 32,
};

export const icoLaunchpadInvestorBenefits: Section = section(
  [
    singleColumnRow([
      el.text("WHY PARTICIPATE", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.heading("Four reasons to back this round", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Launchpad participants get material advantages over the open market at token generation event.",
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
          25,
          benefit(
            "lucide:flame",
            "Early access",
            "Participate before any exchange listing. Typical round opens 3–6 weeks pre-TGE.",
            theme.rose
          ),
          benefitSettings
        ),
        col(
          25,
          benefit(
            "lucide:tag",
            "Discounted price",
            "Launchpad allocation priced 15–25% below public-market opening price at TGE.",
            theme.emerald
          ),
          benefitSettings
        ),
        col(
          25,
          benefit(
            "lucide:clock",
            "Vesting alignment",
            "Vesting schedules match team locks — we don't get dumped on while founders are locked.",
            theme.sky
          ),
          benefitSettings
        ),
        col(
          25,
          benefit(
            "lucide:vote",
            "Governance rights",
            "Launchpad allocation carries full governance weight from block 1 of the DAO.",
            theme.violet
          ),
          benefitSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Investor Benefits",
    description: "Four investor benefits — early access, discount, vesting, governance",
    category: "ico-launchpad",
    slug: "ico-launchpad-investor-benefits",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
