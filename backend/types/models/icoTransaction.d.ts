interface icoTransactionAttributes {
  id: string;
  userId: string;
  offeringId: string;
  amount: number;
  price: number;
  status: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED";
  releaseUrl: string;
  walletAddress?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoTransactionCreationAttributes
  extends Partial<icoTransactionAttributes> {}
