interface paymentIntentAttributes {
  id: string;
  userId?: string;
  walletId?: string;
  amount: number;
  currency: string;
  tax: number; // New field
  discount: number; // New field
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  ipnUrl: string;
  successUrl: string;
  failUrl: string;
  apiKey: string;
  transactionId: string | null;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type paymentIntentPk = "id";
type paymentIntentId = paymentIntentAttributes[paymentIntentPk];
type paymentIntentOptionalAttributes =
  | "id"
  | "userId"
  | "walletId"
  | "transactionId"
  | "description"
  | "createdAt"
  | "updatedAt"
  | "tax"
  | "discount";

type paymentIntentCreationAttributes = Optional<
  paymentIntentAttributes,
  paymentIntentOptionalAttributes
>;
