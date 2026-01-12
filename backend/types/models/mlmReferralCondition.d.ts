interface mlmReferralConditionAttributes {
  id: string;
  name: string;
  title: string;
  description: string;
  type:
    | "DEPOSIT"
    | "TRADE"
    | "SPOT_TRADE"
    | "BINARY_WIN"
    | "INVESTMENT"
    | "AI_INVESTMENT"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "ECOMMERCE_PURCHASE"
    | "P2P_TRADE"
    | "NFT_TRADE"
    | "COPY_TRADING"
    | "FUTURES_TRADE"
    | "TOKEN_PURCHASE";
  reward: number;
  rewardType: "PERCENTAGE" | "FIXED";
  rewardWalletType: "FIAT" | "SPOT" | "ECO";
  rewardCurrency: string;
  rewardChain?: string;
  image?: string;
  minAmount: number;
  status: boolean;
}

type mlmReferralConditionPk = "id";
type mlmReferralConditionId =
  mlmReferralConditionAttributes[mlmReferralConditionPk];
type mlmReferralConditionOptionalAttributes = "rewardChain" | "image" | "minAmount" | "status";
type mlmReferralConditionCreationAttributes = Optional<
  mlmReferralConditionAttributes,
  mlmReferralConditionOptionalAttributes
>;
