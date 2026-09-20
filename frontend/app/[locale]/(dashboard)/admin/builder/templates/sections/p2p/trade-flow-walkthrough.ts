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

const walkthroughStep = (
  num: string,
  title: string,
  description: string,
  timing: string,
  icon: string,
  accent: string
) =>
  row(
    [
      col(
        10,
        [
          el.text(num, {
            fontSize: 24,
            fontWeight: "800",
            color: accent,
            textAlign: "center",
            marginBottom: 0,
          }),
        ],
        {
          backgroundColor: "rgba(14,159,111,0.1)",
          borderRadius: 999,
          paddingTop: 18,
          paddingBottom: 18,
          paddingLeft: 0,
          paddingRight: 0,
          width: "64px",
          height: "64px",
          maxWidth: "64px",
        }
      ),
      col(
        70,
        [
          el.heading(title, {
            level: "h3",
            fontSize: 22,
            fontWeight: "700",
            color: theme.text,
            marginBottom: 8,
          }),
          el.text(description, {
            fontSize: 15,
            color: theme.textMuted,
            lineHeight: "1.6",
            marginBottom: 0,
          }),
        ]
      ),
      col(
        20,
        [
          el.icon(icon, { size: 18, color: accent, marginBottom: 6 }),
          el.text(timing, {
            fontSize: 13,
            color: theme.text,
            fontWeight: "600",
            marginBottom: 0,
          }),
        ],
        { textAlign: "right" }
      ),
    ],
    {
      ...rowPresets.narrow,
      maxWidth: "900px",
      gutter: 20,
      paddingTop: 24,
      paddingBottom: 24,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.bgCard,
      marginBottom: 16,
      verticalAlign: "middle",
    }
  );

export const p2pTradeFlowWalkthrough: Section = section(
  [
    singleColumnRow([
      el.text("A TRADE IN 6 STEPS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("From offer to settlement in under 15 minutes", {
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
        "Here's exactly what happens when you trade peer-to-peer on our platform.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    walkthroughStep("01", "Pick an offer", "Browse 40,000+ live offers and filter by price, payment method, and merchant rating.", "~ 2 min", "lucide:search", theme.primary),
    walkthroughStep("02", "Open trade", "Lock the price and open the trade. Crypto moves to escrow in under 3 seconds.", "< 3 sec", "lucide:lock", theme.sky),
    walkthroughStep("03", "Pay the seller", "Send payment via your chosen rail — bank transfer, PayPal, Wise, local payment apps.", "1-10 min", "lucide:banknote", theme.amber),
    walkthroughStep("04", "Mark as paid", "Upload proof of payment directly in-chat. Seller gets an instant notification.", "~ 30 sec", "lucide:send", theme.violet),
    walkthroughStep("05", "Seller confirms", "Seller verifies receipt and releases crypto from escrow to your wallet.", "2-10 min", "lucide:check", theme.emerald),
    walkthroughStep("06", "Trade complete", "Leave a rating, earn merchant points, and withdraw your crypto anywhere.", "Instant", "lucide:trophy", theme.rose),
  ],
  {
    name: "Trade Flow Walkthrough",
    description: "Vertical step-by-step walkthrough of a full P2P trade with timing",
    category: "p2p",
    slug: "p2p-trade-flow-walkthrough",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
