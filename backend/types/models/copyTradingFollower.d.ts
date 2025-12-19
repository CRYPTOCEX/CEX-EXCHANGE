type FollowerStatus = "ACTIVE" | "PAUSED" | "STOPPED";
type CopyMode = "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";

interface copyTradingFollowerAttributes {
  id: string;
  userId: string;
  leaderId: string;
  copyMode: CopyMode;
  fixedAmount?: number;
  fixedRatio?: number;
  maxDailyLoss?: number;
  maxPositionSize?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  status: FollowerStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

type copyTradingFollowerPk = "id";
type copyTradingFollowerId = copyTradingFollowerAttributes[copyTradingFollowerPk];
type copyTradingFollowerOptionalAttributes =
  | "id"
  | "fixedAmount"
  | "fixedRatio"
  | "maxDailyLoss"
  | "maxPositionSize"
  | "stopLossPercent"
  | "takeProfitPercent"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type copyTradingFollowerCreationAttributes = Optional<
  copyTradingFollowerAttributes,
  copyTradingFollowerOptionalAttributes
>;
