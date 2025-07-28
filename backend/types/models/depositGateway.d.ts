interface depositGatewayAttributes {
  id: string;
  name: string;
  title: string;
  description: string;
  image?: string;
  alias?: string;
  currencies?: string[];
  fixedFee?: number | Record<string, number>;
  percentageFee?: number | Record<string, number>;
  minAmount?: number | Record<string, number>;
  maxAmount?: number | Record<string, number>;
  type: "FIAT" | "CRYPTO";
  status?: boolean;
  version?: string;
  productId?: string;
}

type depositGatewayPk = "id";
type depositGatewayId = depositGatewayAttributes[depositGatewayPk];
type depositGatewayOptionalAttributes =
  | "id"
  | "image"
  | "alias"
  | "currencies"
  | "fixedFee"
  | "percentageFee"
  | "minAmount"
  | "maxAmount"
  | "type"
  | "status"
  | "version"
  | "productId";
type depositGatewayCreationAttributes = Optional<
  depositGatewayAttributes,
  depositGatewayOptionalAttributes
>;
