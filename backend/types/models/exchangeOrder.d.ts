


interface exchangeOrderAttributes {
  id: string;

  referenceId?: string;
  userId: string;
  status: "OPEN" | "CLOSED" | "CANCELED" | "EXPIRED" | "REJECTED";
  symbol: string;
  type: "MARKET" | "LIMIT";
  timeInForce: "GTC" | "IOC" | "FOK" | "PO";
  side: "BUY" | "SELL";
  price: number;
  average?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  trades?: string;
  fee: number;
  feeCurrency: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type exchangeOrderPk = "id";
type exchangeOrderId = exchangeOrderAttributes[exchangeOrderPk];
type exchangeOrderOptionalAttributes =
  | "id"
  | "referenceId"
  | "average"
  | "trades"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type exchangeOrderCreationAttributes = Optional<
  exchangeOrderAttributes,
  exchangeOrderOptionalAttributes
>;
