interface copyTradingFollowerAllocationAttributes {
  id: string;
  followerId: string;
  symbol: string;
  baseAmount: number;
  baseUsedAmount: number;
  quoteAmount: number;
  quoteUsedAmount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type copyTradingFollowerAllocationPk = "id";
type copyTradingFollowerAllocationId = copyTradingFollowerAllocationAttributes[copyTradingFollowerAllocationPk];
type copyTradingFollowerAllocationOptionalAttributes =
  | "id"
  | "baseUsedAmount"
  | "quoteUsedAmount"
  | "isActive"
  | "createdAt"
  | "updatedAt";
type copyTradingFollowerAllocationCreationAttributes = Optional<
  copyTradingFollowerAllocationAttributes,
  copyTradingFollowerAllocationOptionalAttributes
>;
