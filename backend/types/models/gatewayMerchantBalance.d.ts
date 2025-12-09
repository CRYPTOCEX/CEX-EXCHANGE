type GatewayMerchantBalanceWalletType = "FIAT" | "SPOT" | "ECO";

interface gatewayMerchantBalanceAttributes {
  id: string;
  merchantId: string;
  currency: string;
  walletType: GatewayMerchantBalanceWalletType;
  available: number;
  pending: number;
  reserved: number;
  totalReceived: number;
  totalRefunded: number;
  totalFees: number;
  totalPaidOut: number;
  updatedAt?: Date;
}

type gatewayMerchantBalancePk = "id";
type gatewayMerchantBalanceId = gatewayMerchantBalanceAttributes[gatewayMerchantBalancePk];
type gatewayMerchantBalanceOptionalAttributes =
  | "id"
  | "walletType"
  | "available"
  | "pending"
  | "reserved"
  | "totalReceived"
  | "totalRefunded"
  | "totalFees"
  | "totalPaidOut"
  | "updatedAt";
type gatewayMerchantBalanceCreationAttributes = Optional<
  gatewayMerchantBalanceAttributes,
  gatewayMerchantBalanceOptionalAttributes
>;
