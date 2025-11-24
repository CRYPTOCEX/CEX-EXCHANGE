


interface mlmReferralAttributes {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  referrerId: string;
  referredId: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type mlmReferralPk = "id";
type mlmReferralId = mlmReferralAttributes[mlmReferralPk];
type mlmReferralOptionalAttributes =
  | "id"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type mlmReferralCreationAttributes = Optional<
  mlmReferralAttributes,
  mlmReferralOptionalAttributes
>;
