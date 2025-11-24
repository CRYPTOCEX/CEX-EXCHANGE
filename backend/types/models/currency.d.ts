interface currencyAttributes {
  id: string;
  name: string;
  symbol: string;
  precision: number;
  price?: number | null;
  status: boolean;
}

type currencyPk = "id";
type currencyId = currencyAttributes[currencyPk];
type currencyOptionalAttributes = "id" | "price";
type currencyCreationAttributes = Optional<
  currencyAttributes,
  currencyOptionalAttributes
>;
