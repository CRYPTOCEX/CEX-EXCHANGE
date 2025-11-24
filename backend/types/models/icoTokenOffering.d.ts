interface icoTokenOfferingAttributes {
  id: string;
  userId: string;
  planId: string;
  typeId: string;
  name: string;
  symbol: string;
  icon: string;
  status: "ACTIVE" | "SUCCESS" | "FAILED" | "UPCOMING" | "PENDING" | "REJECTED";
  purchaseWalletCurrency: string;
  purchaseWalletType: string;
  tokenPrice: number;
  targetAmount: number;
  startDate: Date;
  endDate: Date;
  participants: number;
  currentPrice?: number;
  priceChange?: number;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  reviewNotes?: string;
  isPaused: boolean;
  isFlagged: boolean;
  featured?: boolean;
  website?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoTokenOfferingCreationAttributes
  extends Partial<icoTokenOfferingAttributes> {}
