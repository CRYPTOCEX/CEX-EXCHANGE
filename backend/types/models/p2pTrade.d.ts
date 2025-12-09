interface p2pTradeAttributes {
  id: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  type: "BUY" | "SELL";
  currency: string;
  amount: number;
  price: number;
  total: number;
  status: "PENDING" | "PAYMENT_SENT" | "COMPLETED" | "CANCELLED" | "DISPUTED" | "EXPIRED";
  paymentMethod: string;
  paymentDetails?: any;
  timeline?: any;
  terms?: string;
  escrowFee?: string;
  buyerFee?: number;
  sellerFee?: number;
  escrowTime?: string;
  paymentConfirmedAt?: Date;
  paymentReference?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface p2pTradeCreationAttributes extends Partial<p2pTradeAttributes> {}
