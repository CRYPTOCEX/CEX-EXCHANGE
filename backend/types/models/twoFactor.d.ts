interface twoFactorAttributes {
  id: string;
  userId: string;
  secret: string;
  type: "EMAIL" | "SMS" | "APP";
  enabled: boolean;
  recoveryCodes?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type twoFactorPk = "id";
type twoFactorId = twoFactorAttributes[twoFactorPk];
type twoFactorOptionalAttributes =
  | "id"
  | "enabled"
  | "recoveryCodes"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type twoFactorCreationAttributes = Optional<
  twoFactorAttributes,
  twoFactorOptionalAttributes
>;
