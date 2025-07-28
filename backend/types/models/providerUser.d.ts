


interface providerUserAttributes {
  id: string;
  provider: "GOOGLE" | "WALLET";
  providerUserId: string;
  userId: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type providerUserPk = "id";
type providerUserId = providerUserAttributes[providerUserPk];
type providerUserOptionalAttributes =
  | "id"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type providerUserCreationAttributes = Optional<
  providerUserAttributes,
  providerUserOptionalAttributes
>;
