interface p2pActivityLogAttributes {
  id: string;
  userId: string;
  type: string;
  action: string;
  details?: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface p2pActivityLogCreationAttributes
  extends Partial<p2pActivityLogAttributes> {}
