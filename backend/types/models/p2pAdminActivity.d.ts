interface p2pAdminActivityAttributes {
  id: string;
  type: string;
  relatedEntityId: string; // e.g., tradeId, offerId, reviewId etc.
  relatedEntityName: string; // e.g., "trade", "offer", "review"
  adminId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface p2pAdminActivityCreationAttributes
  extends Partial<p2pAdminActivityAttributes> {}
