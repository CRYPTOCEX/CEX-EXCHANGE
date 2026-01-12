


interface exchangeAttributes {
  id: string;
  name: string;
  title: string;
  description?: string;
  status?: boolean;
  username?: string;
  licenseStatus?: boolean;
  version?: string;
  productId?: string;
  type?: string;
  link?: string;
  proxyUrl?: string;
}

type exchangePk = "id";
type exchangeId = exchangeAttributes[exchangePk];
type exchangeOptionalAttributes =
  | "id"
  | "description"
  | "status"
  | "username"
  | "licenseStatus"
  | "version"
  | "productId"
  | "type"
  | "link"
  | "proxyUrl";
type exchangeCreationAttributes = Optional<
  exchangeAttributes,
  exchangeOptionalAttributes
>;
