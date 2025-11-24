


interface oneTimeTokenAttributes {
  id: string;
  tokenId: string;
  tokenType?: "RESET";
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type oneTimeTokenPk = "id";
type oneTimeTokenId = oneTimeTokenAttributes[oneTimeTokenPk];
type oneTimeTokenOptionalAttributes =
  | "id"
  | "tokenType"
  | "createdAt"
  | "updatedAt";
type oneTimeTokenCreationAttributes = Optional<
  oneTimeTokenAttributes,
  oneTimeTokenOptionalAttributes
>;
