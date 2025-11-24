


interface ecosystemUtxoAttributes {
  id: string;
  walletId: string;
  transactionId: string;
  index: number;
  amount: number;
  script: string;
  status: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type ecosystemUtxoPk = "id";
type ecosystemUtxoId = ecosystemUtxoAttributes[ecosystemUtxoPk];
type ecosystemUtxoOptionalAttributes =
  | "id"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type ecosystemUtxoCreationAttributes = Optional<
  ecosystemUtxoAttributes,
  ecosystemUtxoOptionalAttributes
>;
