


interface ecosystemBlockchainAttributes {
  id: string;
  productId: string;
  name: string;
  chain?: string;
  description?: string;
  link?: string;
  status?: boolean;
  version?: string;
  image?: string;
}

type ecosystemBlockchainPk = "id";
type ecosystemBlockchainId = ecosystemBlockchainAttributes[ecosystemBlockchainPk];
type ecosystemBlockchainOptionalAttributes =
  | "id"
  | "chain"
  | "description"
  | "link"
  | "status"
  | "version"
  | "image";
type ecosystemBlockchainCreationAttributes = Optional<
  ecosystemBlockchainAttributes,
  ecosystemBlockchainOptionalAttributes
>;
