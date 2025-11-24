


interface ecosystemMasterWalletAttributes {
  id: string;

  chain: string;
  currency: string;
  address: string;
  balance: number;
  data?: string;
  status: boolean;
  lastIndex: number;
}

type ecosystemMasterWalletPk = "id";
type ecosystemMasterWalletId =
  ecosystemMasterWalletAttributes[ecosystemMasterWalletPk];
type ecosystemMasterWalletOptionalAttributes =
  | "id"
  | "balance"
  | "data"
  | "status"
  | "lastIndex";
type ecosystemMasterWalletCreationAttributes = Optional<
  ecosystemMasterWalletAttributes,
  ecosystemMasterWalletOptionalAttributes
>;
