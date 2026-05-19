"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.storeCustodialWallet = storeCustodialWallet;
const utils_1 = require("../master/utils");
const db_1 = require("@b/db");
const ethers_1 = require("ethers");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Create a new ecosystem custodial wallet",
    description: "Creates a new custodial wallet by deploying a smart contract on the blockchain. The wallet is associated with a master wallet and automatically configured with the appropriate chain and network settings.",
    operationId: "createEcosystemCustodialWallet",
    tags: ["Admin", "Ecosystem", "Wallet"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        masterWalletId: {
                            type: "string",
                            description: "Master wallet ID associated with the custodial wallet",
                        },
                    },
                    required: ["masterWalletId"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Custodial wallet created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "string", description: "Custodial wallet ID" },
                                    masterWalletId: { type: "string", description: "Associated master wallet ID" },
                                    address: { type: "string", description: "Wallet contract address" },
                                    chain: { type: "string", description: "Blockchain chain" },
                                    network: { type: "string", description: "Network (mainnet/testnet)" },
                                    status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "create.ecosystem.custodial.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Create Ecosystem Custodial Wallet",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { masterWalletId } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Input");
        if (!masterWalletId) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Master wallet ID is required" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Master Wallet");
        const wallet = await db_1.models.ecosystemMasterWallet.findByPk(masterWalletId);
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Master wallet with ID ${masterWalletId} not found` });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deploying Custodial Contract");
        const contractAddress = await (0, utils_1.deployCustodialContract)(wallet, ctx);
        if (!contractAddress) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to deploy custodial wallet contract - no address returned" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Storing Custodial Wallet");
        const custodialWallet = await storeCustodialWallet(wallet.id, wallet.chain, contractAddress);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Custodial wallet created successfully");
        return {
            message: "Ecosystem custodial wallet created successfully",
            data: custodialWallet,
        };
    }
    catch (error) {
        console.error("Custodial wallet creation error:", error);
        if ((0, ethers_1.isError)(error, "INSUFFICIENT_FUNDS")) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds in master wallet to deploy custodial contract" });
        }
        if (error.message.includes("Provider not initialized")) {
            throw (0, error_1.createError)({ statusCode: 503, message: `Blockchain provider for ${body.masterWalletId ? 'selected chain' : 'unknown chain'} is not configured` });
        }
        if (error.message.includes("Smart contract ABI or Bytecode not found")) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Custodial wallet smart contract files are missing - please contact administrator" });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: error.message || "Failed to create custodial wallet" });
    }
};
async function storeCustodialWallet(walletId, chain, contractAddress) {
    return await db_1.models.ecosystemCustodialWallet.create({
        masterWalletId: walletId,
        address: contractAddress,
        network: process.env[`${chain}_NETWORK`] || "mainnet",
        chain: chain,
        status: "ACTIVE",
    });
}
