import type { Section, Element } from "@/types/builder";
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

const step = (number: string, icon: string, title: string, body: string): Element[] => [
  el.text(number, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.18em",
    color: theme.violet,
    marginBottom: 16,
  }),
  el.icon(icon, {
    size: 32,
    color: theme.violet,
    marginBottom: 20,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 10,
    letterSpacing: "-0.01em",
  }),
  el.text(body, {
    fontSize: 14,
    lineHeight: "1.65",
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

const stepSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: 28,
};

export const nftHowToMintSteps: Section = section(
  [
    singleColumnRow([
      el.text("HOW IT WORKS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.violet,
        marginBottom: 12,
      }),
      el.heading("Mint your NFT in four steps", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Under a minute end to end on mainnet. No code, no Discord rituals.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "580px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(
          25,
          step(
            "STEP 01",
            "lucide:wallet",
            "Connect wallet",
            "MetaMask, Rainbow, Coinbase, or WalletConnect — we accept them all on Ethereum and Base."
          ),
          stepSettings
        ),
        col(
          25,
          step(
            "STEP 02",
            "lucide:image",
            "Select quantity",
            "Choose how many NFTs to mint from the live supply — up to 2 per wallet during allowlist."
          ),
          stepSettings
        ),
        col(
          25,
          step(
            "STEP 03",
            "lucide:check-circle",
            "Confirm on-chain",
            "Sign the transaction in your wallet. Gas is shown before you commit — no surprises."
          ),
          stepSettings
        ),
        col(
          25,
          step(
            "STEP 04",
            "lucide:sparkles",
            "View & reveal",
            "Your NFTs land in the wallet and appear on your profile within one block of confirmation."
          ),
          stepSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "How to Mint — Steps",
    description: "Four-step mint walkthrough with icons and copy",
    category: "nft",
    slug: "nft-how-to-mint-steps",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
