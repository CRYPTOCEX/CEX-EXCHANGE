type GatewayApiKeyType = "PUBLIC" | "SECRET";
type GatewayApiKeyMode = "LIVE" | "TEST";

interface gatewayApiKeyAttributes {
  id: string;
  merchantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  lastFourChars: string;
  type: GatewayApiKeyType;
  mode: GatewayApiKeyMode;
  permissions: string[];
  ipWhitelist?: string[];
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  status: boolean;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type gatewayApiKeyPk = "id";
type gatewayApiKeyId = gatewayApiKeyAttributes[gatewayApiKeyPk];
type gatewayApiKeyOptionalAttributes =
  | "id"
  | "permissions"
  | "ipWhitelist"
  | "successUrl"
  | "cancelUrl"
  | "webhookUrl"
  | "lastUsedAt"
  | "lastUsedIp"
  | "status"
  | "expiresAt"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type gatewayApiKeyCreationAttributes = Optional<
  gatewayApiKeyAttributes,
  gatewayApiKeyOptionalAttributes
>;
