interface p2pReviewAttributes {
  id: string;
  reviewerId: string;
  revieweeId: string;
  tradeId?: string; // Optional association to a trade
  rating: number;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface p2pReviewCreationAttributes extends Partial<p2pReviewAttributes> {}
