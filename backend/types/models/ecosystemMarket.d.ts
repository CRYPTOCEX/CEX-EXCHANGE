


interface ecosystemMarketAttributes {
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

type ecosystemMarketPk = "id";
type ecosystemMarketId = ecosystemMarketAttributes[ecosystemMarketPk];
type ecosystemMarketOptionalAttributes =
  | "id"
  | "isTrending"
  | "isHot"
  | "metadata"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type ecosystemMarketCreationAttributes = Optional<
  ecosystemMarketAttributes,
  ecosystemMarketOptionalAttributes
>;
