"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeUpdateSchema = exports.baseExchangeSchema = exports.exchangeSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the exchange");
const name = (0, schema_1.baseStringSchema)("Name of the exchange");
const title = (0, schema_1.baseStringSchema)("Title of the exchange");
const status = (0, schema_1.baseBooleanSchema)("Operational status of the exchange");
const username = (0, schema_1.baseStringSchema)("Associated username", 191, 0, true);
const licenseStatus = (0, schema_1.baseBooleanSchema)("License status of the exchange");
const version = (0, schema_1.baseStringSchema)("Version of the exchange software", 191, 0, true);
const productId = (0, schema_1.baseStringSchema)("Product ID associated with the exchange", 191, 0, true);
const type = (0, schema_1.baseStringSchema)("Type of exchange (e.g., spot, futures)", 191, 0, true);
const icon = (0, schema_1.baseStringSchema)("URL to the exchange's icon", 1000, 0, true);
const proxyUrl = (0, schema_1.baseStringSchema)("Proxy URL for exchange API requests (e.g., http://user:pass@host:port or socks5://host:port)", 500, 0, true);
exports.exchangeSchema = {
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
    proxyUrl,
};
exports.baseExchangeSchema = {
    id,
    name,
    title,
    status,
    username,
    licenseStatus,
    version,
    productId,
    type,
    proxyUrl,
};
exports.exchangeUpdateSchema = {
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
        proxyUrl,
    },
    required: ["name", "title"],
};
