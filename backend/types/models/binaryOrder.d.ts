interface binaryOrderAttributes {
  id: string;
  userId: string;
  symbol: string;
  price: number;
  amount: number;
  profit: number;
  side: BinaryOrderSide;
  type: BinaryOrderType;
  durationType: "TIME" | "TICKS";
  barrier?: number;
  strikePrice?: number;
  payoutPerPoint?: number;
  status: "PENDING" | "WIN" | "LOSS" | "DRAW" | "CANCELED";
  isDemo: boolean;
  closedAt: Date;
  closePrice?: number;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type binaryOrderPk = "id";
type binaryOrderId = binaryOrderAttributes[binaryOrderPk];
type binaryOrderOptionalAttributes =
  | "id"
  | "isDemo"
  | "closePrice"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type binaryOrderCreationAttributes = Optional<
  binaryOrderAttributes,
  binaryOrderOptionalAttributes
>;

type BinaryOrderType =
  | "RISE_FALL"
  | "HIGHER_LOWER"
  | "TOUCH_NO_TOUCH"
  | "CALL_PUT"
  | "TURBO";

type BinaryOrderSide =
  | "RISE"
  | "FALL"
  | "HIGHER"
  | "LOWER"
  | "TOUCH"
  | "NO_TOUCH"
  | "CALL"
  | "PUT"
  | "UP"
  | "DOWN";

interface OrderValidationConfig {
  validSides: readonly string[];
  requiresBarrier?: boolean;
  requiresStrikePrice?: boolean;
  requiresPayoutPerPoint?: boolean;
  requiresDurationType?: readonly string[];
}

interface ValidateCreateOrderInputParams {
  side: string;
  type: BinaryOrderType;
  barrier?: number;
  strikePrice?: number;
  payoutPerPoint?: number;
  durationType?: string;
}
