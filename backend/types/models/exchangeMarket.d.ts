


interface exchangeMarketAttributes {
  id: string;
  currency: string;
  pair: string;
  isTrending?: boolean;
  isHot?: boolean;
  metadata?: string;
  status: boolean;
}

type exchangeMarketPk = "id";
type exchangeMarketId = exchangeMarketAttributes[exchangeMarketPk];
type exchangeMarketOptionalAttributes =
  | "id"
  | "isTrending"
  | "isHot"
  | "metadata";
type exchangeMarketCreationAttributes = Optional<
  exchangeMarketAttributes,
  exchangeMarketOptionalAttributes
>;
