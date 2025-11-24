import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Shield, Lock, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

const FEATURE_MESSAGES = {
  // Trading features
  trade: {
    title: "Trading Access",
    description:
      "Start your trading journey with our secure and regulated platform. Complete verification to access real-time markets and advanced trading tools.",
  },
  binary_trading: {
    title: "Binary Options Trading",
    description:
      "Unlock high-yield binary options trading with enhanced security measures. Verification ensures compliance with financial regulations.",
  },
  futures_trading: {
    title: "Futures Trading",
    description:
      "Trade futures contracts with institutional-grade security. Verification ensures compliance with derivatives trading regulations.",
  },
  view_forex: {
    title: "Forex Market Access",
    description:
      "Access live forex markets and real-time currency data. Verification is required for regulatory compliance in forex trading.",
  },
  deposit_forex: {
    title: "Forex Deposits",
    description:
      "Fund your forex trading account securely. Identity verification protects against fraud and ensures secure transactions.",
  },
  withdraw_forex: {
    title: "Forex Withdrawals",
    description:
      "Withdraw your forex profits safely and securely. Verification prevents unauthorized access to your funds.",
  },

  // Wallet features
  view_wallets: {
    title: "Wallet Management",
    description:
      "Access your digital wallet portfolio with enhanced security. Verification protects your assets and transaction history.",
  },
  deposit_wallet: {
    title: "Wallet Deposits",
    description:
      "Securely deposit funds into your digital wallets. Identity verification prevents money laundering and protects your account.",
  },
  withdraw_wallet: {
    title: "Wallet Withdrawals",
    description:
      "Withdraw funds from your wallets with confidence. Verification ensures only you can access your digital assets.",
  },
  transfer_wallets: {
    title: "Wallet Transfers",
    description:
      "Transfer funds between wallets securely. Verification prevents unauthorized transfers and protects your assets.",
  },
  api_keys: {
    title: "API Access",
    description:
      "Generate and manage API keys for automated trading. Verification ensures secure programmatic access to your account.",
  },

  // Content features
  author_blog: {
    title: "Content Creation",
    description:
      "Share your expertise and create valuable content. Verification establishes credibility and prevents spam.",
  },
  comment_blog: {
    title: "Community Engagement",
    description:
      "Join discussions and engage with our community. Verification ensures authentic interactions and prevents abuse.",
  },

  // E-commerce features
  view_ecommerce: {
    title: "Marketplace Access",
    description:
      "Browse our exclusive marketplace with verified products and services. Verification ensures a trusted shopping experience.",
  },
  order_ecommerce: {
    title: "Marketplace Orders",
    description:
      "Purchase products and services securely. Verification protects both buyers and sellers in transactions.",
  },

  // Investment features
  invest_forex: {
    title: "Forex Investments",
    description:
      "Invest in managed forex portfolios and strategies. Verification ensures compliance with investment regulations.",
  },
  invest_general: {
    title: "Investment Opportunities",
    description:
      "Access exclusive investment products and portfolios. Verification is required for investor protection and compliance.",
  },

  // ICO features
  view_ico: {
    title: "ICO Marketplace",
    description:
      "Explore initial coin offerings and token sales. Verification ensures access to legitimate and compliant projects.",
  },
  purchase_ico: {
    title: "ICO Participation",
    description:
      "Participate in token sales and ICO investments. Verification is required for regulatory compliance and investor protection.",
  },
  create_ico: {
    title: "ICO Creation",
    description:
      "Launch your own token sale or ICO project. Verification ensures legitimacy and builds investor confidence.",
  },

  affiliate_mlm: {
    title: "Affiliate Program",
    description:
      "Join our affiliate network and earn commissions. Verification ensures legitimate partnerships and prevents fraud.",
  },

  // Staking features
  view_staking: {
    title: "Staking Opportunities",
    description:
      "Explore cryptocurrency staking rewards and opportunities. Verification ensures secure access to staking protocols.",
  },
  invest_staking: {
    title: "Staking Investments",
    description:
      "Stake your cryptocurrencies and earn rewards. Verification protects your staked assets and ensures legitimate participation.",
  },

  // P2P features
  make_p2p_offer: {
    title: "P2P Trading",
    description:
      "Create peer-to-peer trading offers. Verification builds trust with other traders and ensures secure transactions.",
  },
  buy_p2p_offer: {
    title: "P2P Purchases",
    description:
      "Buy from peer-to-peer offers safely. Verification protects against fraud and ensures legitimate transactions.",
  },

  // Support features
  ask_faq: {
    title: "Advanced Support",
    description:
      "Access our comprehensive FAQ and knowledge base. Verification provides personalized support experiences.",
  },
  support_ticket: {
    title: "Priority Support",
    description:
      "Get priority customer support and assistance. Verification ensures secure communication and account protection.",
  },
};

export default function KycRequiredNotice({ feature }: { feature?: string }) {
  const t = useTranslations("components/blocks/kyc/kyc-required-notice");
  const featureInfo = feature
    ? FEATURE_MESSAGES[feature as keyof typeof FEATURE_MESSAGES]
    : null;

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4">
      <div className="relative">
        {/* Background gradient circle */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl w-64 h-64 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />

        {/* Main content container */}
        <div className="relative bg-background/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
          {/* Icon container */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              {featureInfo ? featureInfo.title : "Verification Required"}
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto" />
          </div>

          {/* Description */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground leading-relaxed">
              {featureInfo
                ? featureInfo.description
                : "Complete our quick and secure verification process to access all premium features and enhanced security."}
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-muted-foreground">
                {t("enhanced_account_security")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-muted-foreground">
                {t("regulatory_compliance")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-muted-foreground">
                {t("fraud_protection")}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link href="/user/kyc">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {t("complete_verification")}
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              {t("usually_takes_2-3_minutes")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
