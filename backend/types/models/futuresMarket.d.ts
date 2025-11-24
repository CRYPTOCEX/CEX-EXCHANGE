


interface futuresMarketAttributes {
  id: string;
  currency: string;
  pair: string;
  isTrending?: boolean;
  isHot?: boolean;
  metadata?: string;
  status: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type futuresMarketPk = "id";
type futuresMarketId = futuresMarketAttributes[futuresMarketPk];
type futuresMarketOptionalAttributes =
  | "id"
  | "isTrending"
  | "isHot"
  | "metadata"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type futuresMarketCreationAttributes = Optional<
  futuresMarketAttributes,
  futuresMarketOptionalAttributes
>;
