


interface exchangeCurrencyAttributes {
  id: string;
  currency: string;
  name: string;
  precision: number;
  price?: number;
  fee?: number;
  status: boolean;
}

type exchangeCurrencyPk = "id";
type exchangeCurrencyId = exchangeCurrencyAttributes[exchangeCurrencyPk];
type exchangeCurrencyOptionalAttributes = "id" | "price" | "fee";
type exchangeCurrencyCreationAttributes = Optional<
  exchangeCurrencyAttributes,
  exchangeCurrencyOptionalAttributes
>;
