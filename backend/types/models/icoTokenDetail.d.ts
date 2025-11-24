interface icoTokenDetailAttributes {
  id: string;
  offeringId: string;
  tokenType: string;
  totalSupply: number;
  tokensForSale: number;
  salePercentage: number;
  blockchain: string;
  description: string;
  useOfFunds: any;
  links: {
    whitepaper?: string;
    github?: string;
    telegram?: string;
    twitter?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoTokenDetailCreationAttributes
  extends Partial<icoTokenDetailAttributes> {}
