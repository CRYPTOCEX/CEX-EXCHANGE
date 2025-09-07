import { baseStringSchema, baseEnumSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the ecosystem custodial wallet");
const masterWalletId = baseStringSchema(
  "Master wallet ID associated with the custodial wallet"
);
const address = baseStringSchema("Address of the custodial wallet", 255);
const chain = baseStringSchema(
  "Blockchain chain associated with the custodial wallet",
  255
);
const network = baseStringSchema(
  "Network associated with the custodial wallet",
  255
);
const status = baseEnumSchema("Status of the custodial wallet", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const ecosystemCustodialWalletSchema = {
  id,
  masterWalletId,
  address,
  chain,
  network,
  status,
};

export const baseEcosystemCustodialWalletSchema = {
  masterWalletId,
};

export const ecosystemCustodialWalletUpdateSchema = {
  type: "object",
  properties: {
    status,
  },
  required: ["status"],
};

export const ecosystemCustodialWalletStoreSchema = {
  description: `Ecosystem custodial wallet created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseEcosystemCustodialWalletSchema,
      },
    },
  },
};
