


interface mlmReferralRewardAttributes {
  id: string;
  reward: number;
  isClaimed: boolean;
  conditionId: string;
  referrerId: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type mlmReferralRewardPk = "id";
type mlmReferralRewardId = mlmReferralRewardAttributes[mlmReferralRewardPk];
type mlmReferralRewardOptionalAttributes =
  | "id"
  | "isClaimed"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type mlmReferralRewardCreationAttributes = Optional<
  mlmReferralRewardAttributes,
  mlmReferralRewardOptionalAttributes
>;
