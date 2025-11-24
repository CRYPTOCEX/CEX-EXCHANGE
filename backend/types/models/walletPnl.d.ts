


interface walletPnlAttributes {
  id: string;
  userId: string;
  balances: {
    FIAT: number;
    SPOT: number;
    ECO: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

type walletPnlOptionalAttributes =
  | "id"
  | "balances"
  | "createdAt"
  | "updatedAt";
type walletPnlCreationAttributes = Optional<
  walletPnlAttributes,
  walletPnlOptionalAttributes
>;
