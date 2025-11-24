interface walletAttributes {
  id: string;
  userId: string;
  type: "FIAT" | "SPOT" | "ECO" | "FUTURES";
  currency: string;
  balance: number;
  inOrder?: number;
  address?: {
    [key: string]: { address: string; network: string; balance: number };
  };
  status: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type walletPk = "id";
type walletId = walletAttributes[walletPk];
type walletOptionalAttributes =
  | "id"
  | "balance"
  | "inOrder"
  | "address"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type walletCreationAttributes = Optional<
  walletAttributes,
  walletOptionalAttributes
>;
