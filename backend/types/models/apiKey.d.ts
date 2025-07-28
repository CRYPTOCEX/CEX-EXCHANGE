interface apiKeyAttributes {
  id: string;
  userId?: string;
  name: string; // API key name
  key: string;
  permissions: string[]; // Permissions as an array of strings
  ipRestriction: boolean;
  ipWhitelist: string[]; // IP Whitelist as an array of strings
  type: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type apiKeyPk = "id";
type apiKeyId = apiKeyAttributes[apiKeyPk];
type apiKeyOptionalAttributes =
  | "id"
  | "userId"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type apiKeyCreationAttributes = Optional<
  apiKeyAttributes,
  apiKeyOptionalAttributes
>;
