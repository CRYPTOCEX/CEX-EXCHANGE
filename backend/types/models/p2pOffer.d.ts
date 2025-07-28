// Types for P2P Offer

type TRADE_TYPE = "BUY" | "SELL";
type PRICE_MODEL = "FIXED" | "MARGIN";
type OFFER_VISIBILITY = "PUBLIC" | "PRIVATE";
type OFFER_STATUS =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";
type WALLET_TYPE = "FIAT" | "SPOT" | "ECO";

interface PriceConfiguration {
  model: PRICE_MODEL;
  value: number;
  marketPrice?: number;
  finalPrice: number;
}

interface TradeSettings {
  autoCancel: number;
  kycRequired: boolean;
  visibility: OFFER_VISIBILITY;
  termsOfTrade?: string;
  additionalNotes?: string;
}

interface AmountConfiguration {
  total: number;
  min?: number;
  max?: number;
  availableBalance?: number;
}

interface LocationSettings {
  country?: string;
  region?: string;
  city?: string;
  restrictions?: string[];
}

interface UserRequirements {
  minCompletedTrades?: number;
  minSuccessRate?: number;
  minAccountAge?: number;
  trustedOnly?: boolean;
}

// Sequelize attribute definitions for p2pOffer
interface p2pOfferAttributes {
  id: string;
  userId: string;
  type: TRADE_TYPE;
  currency: string;
  walletType: WALLET_TYPE;
  amountConfig: AmountConfiguration;
  priceConfig: PriceConfiguration;
  tradeSettings: TradeSettings;
  locationSettings?: LocationSettings;
  userRequirements?: UserRequirements;
  status: OFFER_STATUS;
  views: number;
  systemTags?: string[];
  adminNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Attributes used when creating a new p2pOffer
interface p2pOfferCreationAttributes extends Partial<p2pOfferAttributes> {}
