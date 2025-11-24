


interface walletDataAttributes {
  id: string;
  walletId: string;
  currency: string;
  chain: string;
  balance: number;
  index: number;
  data: string;
}

type walletDataPk = "id";
type walletDataId = walletDataAttributes[walletDataPk];
type walletDataOptionalAttributes = "id" | "balance" | "index";
type walletDataCreationAttributes = Optional<
  walletDataAttributes,
  walletDataOptionalAttributes
>;
