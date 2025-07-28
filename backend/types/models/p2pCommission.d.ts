interface p2pCommissionAttributes {
  id: string;
  adminId: string;
  amount: number;
  description?: string;
  tradeId?: string; // Optional: commission related to a trade
  offerId?: string; // Optional: commission related to an offer
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface p2pCommissionCreationAttributes
  extends Partial<p2pCommissionAttributes> {}
