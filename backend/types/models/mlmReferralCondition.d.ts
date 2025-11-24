interface mlmReferralConditionAttributes {
  id: string;
  name: string;
  title: string;
  description: string;
  type:
    | "DEPOSIT"
    | "TRADE"
    | "INVESTENT"
    | "INVESTMENT"
    | "BINARY_WIN"
    | "AI_INVESTMENT"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "ECOMMERCE_PURCHASE"
    | "P2P_TRADE";
  reward: number;
  rewardType: "PERCENTAGE" | "FIXED";
  rewardWalletType: "FIAT" | "SPOT" | "ECO";
  rewardCurrency: string;
  rewardChain?: string;
  image?: string;
  status: boolean;
}

type mlmReferralConditionPk = "id";
type mlmReferralConditionId =
  mlmReferralConditionAttributes[mlmReferralConditionPk];
type mlmReferralConditionOptionalAttributes = "rewardChain" | "status";
type mlmReferralConditionCreationAttributes = Optional<
  mlmReferralConditionAttributes,
  mlmReferralConditionOptionalAttributes
>;
