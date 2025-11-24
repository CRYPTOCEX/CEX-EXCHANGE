// Assume base schemas from your provided utilities
import { baseStringSchema, baseBooleanSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the exchange");
const name = baseStringSchema("Name of the exchange");
const title = baseStringSchema("Title of the exchange");
const status = baseBooleanSchema("Operational status of the exchange");
const username = baseStringSchema("Associated username", 191, 0, true);
const licenseStatus = baseBooleanSchema("License status of the exchange");
const version = baseStringSchema(
  "Version of the exchange software",
  191,
  0,
  true
);
const productId = baseStringSchema(
  "Product ID associated with the exchange",
  191,
  0,
  true
);
const type = baseStringSchema(
  "Type of exchange (e.g., spot, futures)",
  191,
  0,
  true
);
const icon = baseStringSchema("URL to the exchange's icon", 1000, 0, true);

export const exchangeSchema = {
  id,
  name,
  title,
  status,
  username,
  licenseStatus,
  version,
  productId,
  type,
  icon,
};

export const baseExchangeSchema = {
  id,
  name,
  title,
  status,
  username,
  licenseStatus,
  version,
  productId,
  type,
};

export const exchangeUpdateSchema = {
  type: "object",
  properties: {
    name,
    title,
    status,
    username,
    licenseStatus,
    version,
    productId,
    type,
  },
  required: ["name", "title"],
};
