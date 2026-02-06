"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const chains_1 = require("@b/api/(ext)/ecosystem/utils/chains");
const schema_1 = require("@b/utils/schema");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Create a new ecosystem master wallet",
    description: "Creates a new master wallet for a specific blockchain. Generates a new wallet with private key, encrypts the sensitive data, and stores it securely in the database. The master wallet is used to manage custodial wallets and ecosystem transactions.",
    operationId: "createEcosystemMasterWallet",
    tags: ["Admin", "Ecosystem", "Wallet"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        chain: (0, schema_1.baseStringSchema)("Blockchain chain associated with the master wallet", 255),
                    },
                    required: ["chain"],
                },
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.ecosystemMasterWalletStoreSchema, "Ecosystem Master Wallet"),
    requiresAuth: true,
    permission: "create.ecosystem.master.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Create Ecosystem Master Wallet",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { chain } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for Existing Master Wallet");
    const existingWallet = await (0, wallet_1.getMasterWalletByChain)(chain);
    if (existingWallet) {
        throw (0, error_1.createError)({ statusCode: 409, message: `Master wallet already exists: ${chain}` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating and Encrypting Wallet");
    const walletData = await (0, utils_1.createAndEncryptWallet)(chain, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Storing Master Wallet");
    const result = await (0, utils_1.createMasterWallet)(walletData, chains_1.chainConfigs[chain].currency, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Master wallet created successfully for chain: ${chain}`);
    return result;
};
