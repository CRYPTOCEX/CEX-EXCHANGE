"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const custodialWallet_1 = require("@b/api/(ext)/ecosystem/utils/custodialWallet");
const provider_1 = require("@b/api/(ext)/ecosystem/utils/provider");
const ethers_1 = require("ethers");
const encrypt_1 = require("@b/utils/encrypt");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Transfer native tokens from custodial wallet",
    description: "Transfers native blockchain tokens (e.g., ETH, BNB, MATIC) from an ecosystem custodial wallet to a specified recipient address. Requires master wallet private key for signing.",
    operationId: "transferNativeEcosystemCustodialWallet",
    tags: ["Admin", "Ecosystem", "Wallet"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Ecosystem Custodial Wallet ID",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        recipient: {
                            type: "string",
                            description: "Recipient address",
                        },
                        amount: {
                            type: "string",
                            description: "Amount to transfer in the smallest unit (e.g., wei for ETH)",
                        },
                    },
                    required: ["id", "recipient", "amount"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Native tokens transferred successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            transactionHash: {
                                type: "string",
                                description: "Transaction hash",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Custodial Wallet"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.ecosystem.custodial.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Transfer Native Tokens",
};
exports.default = async (data) => {
    const { user, body, params, ctx } = data;
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Authentication required to transfer native tokens" });
    }
    const { id } = params;
    const { recipient, amount } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Custodial Wallet");
        const custodialWallet = await db_1.models.ecosystemCustodialWallet.findByPk(id);
        if (!custodialWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Custodial wallet not found` });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Master Wallet");
        const masterWallet = await db_1.models.ecosystemMasterWallet.findByPk(custodialWallet.masterWalletId);
        if (!masterWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Master wallet not found` });
        }
        if (!masterWallet.data) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Master wallet data not found` });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Decrypting Master Wallet Data");
        const decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
        const { privateKey } = decryptedData;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing Provider and Contract");
        const provider = await (0, provider_1.getProvider)(custodialWallet.chain);
        const signer = new ethers_1.ethers.Wallet(privateKey).connect(provider);
        const contract = await (0, custodialWallet_1.getCustodialWalletContract)(custodialWallet.address, signer);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Executing Native Token Transfer");
        const transaction = await contract.transferNative(recipient, amount);
        await transaction.wait();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Native tokens transferred successfully to ${recipient}`);
        return {
            message: "Native tokens transferred successfully",
        };
    }
    catch (error) {
        console.error(`Failed to transfer native tokens: ${error.message}`);
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
