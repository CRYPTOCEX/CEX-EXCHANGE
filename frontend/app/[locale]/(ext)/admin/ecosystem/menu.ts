import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "blockchains",
    title: "Blockchains",
    description:
      "Manage supported blockchain networks, configure RPC endpoints, and monitor network status.",
    href: "/admin/ecosystem",
    icon: "lucide:boxes",
    exact: true,
  },
  {
    key: "wallets",
    title: "Wallets",
    description: "Wallet infrastructure management.",
    icon: "lucide:wallet",
    child: [
      {
        key: "master-wallets",
        title: "Master Wallets",
        description:
          "Configure platform master wallets for each blockchain with security and backup settings.",
        href: "/admin/ecosystem/wallet/master",
        icon: "lucide:vault",
      },
      {
        key: "custodial-wallets",
        title: "Custodial Wallets",
        description:
          "Monitor user custodial wallets, track balances, and manage wallet operations.",
        href: "/admin/ecosystem/wallet/custodial",
        icon: "lucide:shield-check",
      },
    ],
  },
  {
    key: "markets",
    title: "Markets",
    description:
      "Configure trading markets, set trading pairs, and manage market parameters.",
    href: "/admin/ecosystem/market",
    icon: "lucide:candlestick-chart",
  },
  {
    key: "tokens",
    title: "Tokens",
    description:
      "Manage supported tokens, add new assets, and configure token metadata.",
    href: "/admin/ecosystem/token",
    icon: "lucide:coins",
  },
  {
    key: "utxo",
    title: "UTXO",
    description:
      "Monitor UTXO-based blockchain transactions and manage unspent outputs.",
    href: "/admin/ecosystem/utxo",
    icon: "lucide:git-branch",
  },
  {
    key: "ledgers",
    title: "Ledgers",
    description:
      "View comprehensive ledger entries and transaction history across all wallets.",
    href: "/admin/ecosystem/ledger",
    icon: "lucide:book-open",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.ecosystem;
