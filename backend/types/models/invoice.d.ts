


interface invoiceAttributes {
  id: string;
  amount: number;
  description?: string;
  status: "UNPAID" | "PAID" | "CANCELLED";
  transactionId?: number;
  senderId: string;
  receiverId: string;
  dueDate?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type invoicePk = "id";
type invoiceId = invoiceAttributes[invoicePk];
type invoiceOptionalAttributes =
  | "id"
  | "description"
  | "transactionId"
  | "dueDate"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type invoiceCreationAttributes = Optional<
  invoiceAttributes,
  invoiceOptionalAttributes
>;
