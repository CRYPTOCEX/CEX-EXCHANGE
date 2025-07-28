interface binaryMarketAttributes {
  id: string;
  currency: string;
  pair: string;
  isTrending?: boolean;
  isHot?: boolean;
  status: boolean;
}

// Attributes used for model creation (id optional)
interface binaryMarketCreationAttributes
  extends Optional<binaryMarketAttributes, "id"> {}
