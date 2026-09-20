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

type Tier = {
  name: string;
  volume: string;
  rate: string;
  perks: string[];
  accent: string;
  icon: string;
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Bronze",
    volume: "$0 – $50k monthly",
    rate: "20%",
    perks: [
      "Standard 20% commission",
      "90-day cookie window",
      "Weekly USDT payouts",
      "Creator dashboard access",
    ],
    accent: theme.amber,
    icon: "lucide:medal",
  },
  {
    name: "Silver",
    volume: "$50k – $250k monthly",
    rate: "30%",
    perks: [
      "30% commission on all fees",
      "90-day cookie window",
      "Dedicated affiliate manager",
      "Custom UTM landers",
    ],
    accent: theme.textMuted,
    icon: "lucide:award",
  },
  {
    name: "Gold",
    volume: "$250k – $1M monthly",
    rate: "40%",
    perks: [
      "40% commission on all fees",
      "120-day cookie window",
      "Priority ticket support",
      "Co-marketing opportunities",
    ],
    accent: theme.amber,
    icon: "lucide:trophy",
    featured: true,
  },
  {
    name: "Platinum",
    volume: "$1M+ monthly",
    rate: "50%",
    perks: [
      "50% lifetime revenue share",
      "150-day cookie window",
      "Named account director",
      "Quarterly creator summits",
    ],
    accent: theme.violet,
    icon: "lucide:crown",
  },
];

const tierCard = (t: Tier) =>
  col(
    100,
    [
      ...(t.featured
        ? [
            el.text("MOST POPULAR", {
              fontSize: 10,
              fontWeight: "800",
              color: theme.onBand,
              letterSpacing: "0.16em",
              textAlign: "center",
              backgroundColor: t.accent,
              borderRadius: 999,
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft: 14,
              paddingRight: 14,
              marginBottom: 18,
              display: "inline-block",
            }),
          ]
        : []),
      el.icon(t.icon, { size: 36, color: t.accent, marginBottom: 18 }),
      el.heading(t.name, {
        level: "h3",
        fontSize: 22,
        fontWeight: "800",
        color: theme.text,
        marginBottom: 6,
      }),
      el.text(t.volume, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 20,
      }),
      el.heading(t.rate, {
        level: "h4",
        fontSize: 48,
        fontWeight: "800",
        color: t.accent,
        marginBottom: 6,
        letterSpacing: "-0.02em",
      }),
      el.text("commission", {
        fontSize: 13,
        color: theme.textDim,
        letterSpacing: "0.08em",
        marginBottom: 24,
      }),
      el.divider({ marginTop: 0, marginBottom: 20 }),
      el.list(t.perks, {
        fontSize: 14,
        color: theme.text,
        marginBottom: 0,
        lineHeight: "1.7",
        listStyle: "check",
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: t.featured ? 2 : 1,
      borderStyle: "solid",
      borderColor: t.featured ? t.accent : theme.border,
      borderRadius: 20,
      paddingTop: 32,
      paddingBottom: 32,
      paddingLeft: 28,
      paddingRight: 28,
    }
  );

export const affiliateReferralTierRewards: Section = section(
  [
    singleColumnRow([
      el.text("TIER REWARDS", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.amber,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("The more you refer, the more you earn", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Tier is calculated on your trailing 30-day referred volume. Promotions happen automatically — you'll get an email the moment you level up.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "660px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(tiers.map(tierCard), {
      ...rowPresets.wide,
      gutter: 20,
      verticalAlign: "top",
    }),
  ],
  {
    name: "Referral Tier Rewards",
    description: "4-tier reward table (Bronze, Silver, Gold, Platinum)",
    category: "affiliate",
    slug: "affiliate-referral-tier-rewards",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
