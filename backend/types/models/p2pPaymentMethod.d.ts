interface p2pPaymentMethodAttributes {
  id: string;
  userId?: string;
  name: string;
  icon: string;
  description?: string;
  instructions?: string;
  processingTime?: string;
  fees?: string;
  available: boolean;
  isGlobal: boolean;
  popularityRank: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface p2pPaymentMethodCreationAttributes
  extends Partial<p2pPaymentMethodAttributes> {}
