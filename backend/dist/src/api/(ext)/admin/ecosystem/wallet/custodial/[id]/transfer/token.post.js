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
    summary: "Transfer ERC-20 tokens from custodial wallet",
    description: "Transfers ERC-20 compatible tokens from an ecosystem custodial wallet to a specified recipient address. Supports any standard ERC-20 token on the wallet\'s blockchain.",
    operationId: "transferTokensEcosystemCustodialWallet",
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
                        tokenAddress: {
                            type: "string",
                            description: "ERC-20 token contract address",
                        },
                        recipient: {
                            type: "string",
                            description: "Recipient address",
                        },
                        amount: {
                            type: "string",
                            description: "Amount to transfer in the token's smallest unit (considering token decimals)",
                        },
                    },
                    required: ["id", "tokenAddress", "recipient", "amount"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "ERC-20 tokens transferred successfully",
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
    logTitle: "Transfer ERC-20 Tokens",
};
exports.default = async (data) => {
    const { user, body, params, ctx } = data;
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Authentication required to transfer tokens" });
    }
    const { id } = params;
    const { tokenAddress, recipient, amount } = body;
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
            throw (0, error_1.createError)({ statusCode: 500, message: "Master wallet data not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Decrypting Master Wallet Data");
        const decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
        const { privateKey } = decryptedData;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing Provider and Contract");
        const provider = await (0, provider_1.getProvider)(custodialWallet.chain);
        const signer = new ethers_1.ethers.Wallet(privateKey).connect(provider);
        const contract = await (0, custodialWallet_1.getCustodialWalletContract)(custodialWallet.address, signer);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Executing ERC-20 Token Transfer");
        const transaction = await contract.transferTokens(tokenAddress, recipient, amount);
        await transaction.wait();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`ERC-20 tokens transferred successfully to ${recipient}`);
        return {
            message: "ERC-20 tokens transferred successfully",
        };
    }
    catch (error) {
        console.error(`Failed to transfer ERC-20 tokens: ${error.message}`);
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
