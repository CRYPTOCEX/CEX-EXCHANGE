


interface ecosystemPrivateLedgerAttributes {
  id: string;
  walletId: string;
  index: number;
  currency: string;
  chain: string;
  network: string;
  offchainDifference: number;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type ecosystemPrivateLedgerPk = "id";
type ecosystemPrivateLedgerId =
  ecosystemPrivateLedgerAttributes[ecosystemPrivateLedgerPk];
type ecosystemPrivateLedgerOptionalAttributes =
  | "id"
  | "network"
  | "offchainDifference"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type ecosystemPrivateLedgerCreationAttributes = Optional<
  ecosystemPrivateLedgerAttributes,
  ecosystemPrivateLedgerOptionalAttributes
>;
