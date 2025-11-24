


interface exchangeWatchlistAttributes {
  id: string;
  userId: string;
  symbol: string;
}

type exchangeWatchlistPk = "id";
type exchangeWatchlistId = exchangeWatchlistAttributes[exchangeWatchlistPk];
type exchangeWatchlistOptionalAttributes = "id";
type exchangeWatchlistCreationAttributes = Optional<
  exchangeWatchlistAttributes,
  exchangeWatchlistOptionalAttributes
>;
