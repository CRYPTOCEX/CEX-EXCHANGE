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

const stepCol = (
  num: string,
  icon: string,
  title: string,
  body: string,
  accent: string
) =>
  col(
    100,
    [
      col(
        100,
        [
          el.text(num, {
            fontSize: 18,
            fontWeight: "800",
            color: accent,
            textAlign: "center",
            marginBottom: 0,
          }),
        ],
        {
          width: "56px",
          maxWidth: "56px",
          height: "56px",
          // Was `--primary` frozen at its light-mode RGB (#1f71eb) at 15%.
          backgroundColor: theme.primarySoft,
          borderRadius: 999,
          paddingTop: 16,
          paddingBottom: 16,
          marginBottom: 24,
        }
      ) as any,
      el.icon(icon, { size: 28, color: accent, marginBottom: 16 }),
      el.heading(title, {
        level: "h3",
        fontSize: 20,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 10,
      }),
      el.text(body, {
        fontSize: 15,
        color: theme.textMuted,
        lineHeight: "1.65",
        marginBottom: 0,
      }),
    ]
  );

export const affiliateHowItWorksSteps: Section = section(
  [
    singleColumnRow([
      el.text("HOW IT WORKS", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.primary,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Four steps to start earning", {
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
        "Approval takes under 24 hours. You can start sharing your link the moment you're in.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        stepCol("01", "lucide:user-plus", "Sign up", "Apply in 3 minutes. Get your unique referral link and creator dashboard the same day.", theme.primary),
        stepCol("02", "lucide:share-2", "Share", "Drop your link in videos, posts, newsletters, Discord — anywhere your audience lives.", theme.sky),
        stepCol("03", "lucide:bar-chart-3", "Track", "Watch clicks, sign-ups, and first-trade conversions update in real time.", theme.violet),
        stepCol("04", "lucide:banknote", "Earn", "Commissions appear the moment a referral trades. Withdraw weekly in USDT.", theme.emerald),
      ],
      { ...rowPresets.wide, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "How It Works Steps",
    description: "4-step affiliate flow: sign up, share, track, earn",
    category: "affiliate",
    slug: "affiliate-how-it-works-steps",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
