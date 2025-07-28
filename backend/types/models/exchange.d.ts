


interface exchangeAttributes {
  id: string;
  name: string;
  title: string;
  status?: boolean;
  username?: string;
  licenseStatus?: boolean;
  version?: string;
  productId?: string;
  type?: string;
}

type exchangePk = "id";
type exchangeId = exchangeAttributes[exchangePk];
type exchangeOptionalAttributes =
  | "id"
  | "status"
  | "username"
  | "licenseStatus"
  | "version"
  | "productId"
  | "type";
type exchangeCreationAttributes = Optional<
  exchangeAttributes,
  exchangeOptionalAttributes
>;
