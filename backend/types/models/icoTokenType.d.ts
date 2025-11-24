interface icoTokenTypeAttributes {
  id: string;
  name: string;
  value: string;
  description: string;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoTokenTypeCreationAttributes
  extends Partial<icoTokenTypeAttributes> {}
