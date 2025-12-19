type LeaderStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "INACTIVE";
type TradingStyle = "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface copyTradingLeaderAttributes {
  id: string;
  userId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  tradingStyle: TradingStyle;
  riskLevel: RiskLevel;
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;
  status: LeaderStatus;
  isPublic: boolean;
  applicationNote?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

type copyTradingLeaderPk = "id";
type copyTradingLeaderId = copyTradingLeaderAttributes[copyTradingLeaderPk];
type copyTradingLeaderOptionalAttributes =
  | "id"
  | "avatar"
  | "bio"
  | "applicationNote"
  | "rejectionReason"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type copyTradingLeaderCreationAttributes = Optional<
  copyTradingLeaderAttributes,
  copyTradingLeaderOptionalAttributes
>;
