interface icoBlockchainAttributes {
  id: string;
  name: string;
  value: string;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoBlockchainCreationAttributes
  extends Partial<icoBlockchainAttributes> {}
