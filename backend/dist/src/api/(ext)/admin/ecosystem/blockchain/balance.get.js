"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const ethers_1 = require("ethers");
const web3_js_1 = require("@solana/web3.js");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const db_1 = require("@b/db");
const evmProviderMapping = {
    ETH: {
        url: process.env.ETH_MAINNET_RPC || "https://eth.public-rpc.com",
        chainId: 1,
    },
    ARBITRUM: {
        url: process.env.ARBIRUM_MAINNET_RPC || "https://arbitrum.public-rpc.com",
        chainId: 42161,
    },
    BASE: {
        url: process.env.BASE_MAINNET_RPC || "https://base.blockchain.rpc",
        chainId: 8453,
    },
    BSC: {
        url: process.env.BSC_MAINNET_RPC || "https://bscrpc.com",
        chainId: 56,
    },
    CELO: {
        url: process.env.CELO_MAINNET_RPC || "https://forno.celo.org",
        chainId: 42220,
    },
    FTM: {
        url: process.env.FTM_MAINNET_RPC ||
            "https://fantom-mainnet.public.blastapi.io/",
        chainId: 250,
    },
    OPTIMISM: {
        url: process.env.OPTIMISM_MAINNET_RPC || "https://mainnet.optimism.io",
        chainId: 10,
    },
    POLYGON: {
        url: process.env.POLYGON_MATIC_RPC || "https://polygon-rpc.com",
        chainId: 137,
    },
    RSK: {
        url: process.env.RSK_MAINNET_RPC || "https://public-node.rsk.co",
        chainId: 30,
    },
};
function getEVMProvider(chain) {
    const config = evmProviderMapping[chain];
    if (!config) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported EVM chain: ${chain}` });
    }
    return new ethers_1.JsonRpcProvider(config.url, config.chainId);
}
async function getTokenDeploymentCostForEVM(chain) {
    const provider = getEVMProvider(chain);
    const gasLimit = BigInt(500000);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    if (!gasPrice) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch gas price" });
    }
    const costWei = gasPrice * gasLimit;
    return (0, ethers_1.formatEther)(costWei);
}
async function getTokenDeploymentCostForSolana() {
    const solanaRpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new web3_js_1.Connection(solanaRpc);
    const tokenAccountSize = 165;
    const costLamports = await connection.getMinimumBalanceForRentExemption(tokenAccountSize);
    const costSOL = costLamports / web3_js_1.LAMPORTS_PER_SOL;
    return costSOL.toFixed(4);
}
exports.metadata = {
    summary: "Get master wallet balance and token deployment cost",
    description: "Retrieves the master wallet balance for a specified blockchain and calculates the estimated token deployment cost. For EVM-compatible chains (ETH, ARBITRUM, BASE, BSC, CELO, FTM, OPTIMISM, POLYGON, RSK), it uses ethers.js to estimate gas costs. For Solana, it calculates the rent-exempt minimum for token account creation.",
    operationId: "getEcosystemBlockchainBalance",
    tags: ["Admin", "Ecosystem", "Blockchain"],
    requiresAuth: true,
    logModule: "ADMIN_ECO",
    logTitle: "Get wallet balance and token deployment cost",
    parameters: [
        {
            index: 0,
            name: "chain",
            in: "query",
            required: true,
            schema: {
                type: "string",
                enum: ["ETH", "ARBITRUM", "BASE", "BSC", "CELO", "FTM", "OPTIMISM", "POLYGON", "RSK", "SOL"]
            },
            description: "The blockchain chain identifier for which to retrieve the wallet balance and token deployment cost.",
        },
    ],
    responses: {
        200: {
            description: "Master wallet balance and token deployment cost retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            wallet: {
                                type: "object",
                                properties: {
                                    id: {
                                        type: "string",
                                        format: "uuid",
                                        description: "Master wallet unique identifier"
                                    },
                                    chain: {
                                        type: "string",
                                        description: "Blockchain chain identifier"
                                    },
                                    currency: {
                                        type: "string",
                                        description: "Native currency symbol"
                                    },
                                    address: {
                                        type: "string",
                                        description: "Wallet address"
                                    },
                                    balance: {
                                        type: "number",
                                        description: "Current wallet balance"
                                    },
                                },
                                required: ["id", "chain", "currency", "address", "balance"]
                            },
                            tokenDeploymentCost: {
                                type: "string",
                                description: "Estimated cost to deploy a token in native currency"
                            },
                        },
                        required: ["wallet", "tokenDeploymentCost"]
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Master wallet"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ecosystem.blockchain",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    const chain = (query.chain || "").toUpperCase();
    if (!chain)
        throw (0, error_1.createError)(400, "Chain parameter is required");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving master wallet for chain ${chain}`);
        const masterWallet = await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain, status: true },
        });
        if (!masterWallet)
            throw (0, error_1.createError)(404, "Master wallet not found for the specified chain");
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating token deployment cost");
        let tokenDeploymentCost;
        if (chain === "SOL") {
            tokenDeploymentCost = await getTokenDeploymentCostForSolana();
        }
        else if (evmProviderMapping[chain]) {
            tokenDeploymentCost = await getTokenDeploymentCostForEVM(chain);
        }
        else {
            tokenDeploymentCost =
                "Token deployment cost not available for this chain";
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Balance and cost retrieved successfully");
        return {
            wallet: {
                id: masterWallet.id,
                chain: masterWallet.chain,
                currency: masterWallet.currency,
                address: masterWallet.address,
                balance: masterWallet.balance,
            },
            tokenDeploymentCost,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)(500, error.message);
    }
};
