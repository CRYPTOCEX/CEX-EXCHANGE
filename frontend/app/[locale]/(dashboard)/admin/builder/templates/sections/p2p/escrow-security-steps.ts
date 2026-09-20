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

const step = (
  num: string,
  icon: string,
  title: string,
  description: string,
  accent: string
) =>
  col(
    100,
    [
      el.text(num, {
        fontSize: 12,
        fontWeight: "800",
        color: accent,
        letterSpacing: "0.22em",
        marginBottom: 14,
      }),
      el.icon(icon, { size: 36, color: accent, marginBottom: 18 }),
      el.heading(title, {
        level: "h3",
        fontSize: 19,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 10,
      }),
      el.text(description, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.65",
        marginBottom: 0,
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 16,
      paddingTop: 28,
      paddingBottom: 28,
      paddingLeft: 24,
      paddingRight: 24,
    }
  );

export const p2pEscrowSecuritySteps: Section = section(
  [
    singleColumnRow([
      el.text("HOW ESCROW PROTECTS YOU", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.emerald,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Four-step escrow. Zero trust required.", {
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
        "Crypto is locked in smart-contract escrow the moment an order opens, and only released when payment is confirmed.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        step("STEP 01", "lucide:file-text", "Order placed", "Buyer opens a trade at a locked-in price. Offer is matched in under 3 seconds.", theme.primary),
        step("STEP 02", "lucide:lock", "Crypto held", "Seller's crypto is moved to escrow automatically. Neither side can touch it.", theme.sky),
        step("STEP 03", "lucide:banknote", "Payment sent", "Buyer pays via the chosen rail and marks the order paid with proof.", theme.amber),
        step("STEP 04", "lucide:check-circle-2", "Crypto released", "Seller confirms payment — escrow releases crypto to the buyer's wallet.", theme.emerald),
      ],
      { ...rowPresets.wide, gutter: 20 }
    ),
  ],
  {
    name: "Escrow Security Steps",
    description: "Four-step escrow flow explaining order, lock, pay, release",
    category: "p2p",
    slug: "p2p-escrow-security-steps",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
