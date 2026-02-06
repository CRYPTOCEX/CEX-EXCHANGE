"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
const tokens_1 = require("@b/api/(ext)/ecosystem/utils/tokens");
const safe_imports_1 = require("@b/utils/safe-imports");
const chains_1 = require("@b/api/(ext)/ecosystem/utils/chains");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const task_1 = require("@b/utils/task");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Deploys a new ecosystem token",
    description: "Deploys a new token contract on the blockchain and registers it in the platform. Supports both ERC20 tokens (EVM chains) and SPL tokens (Solana). The token is deployed using the master wallet and initial supply is minted to the specified holder.",
    operationId: "deployEcosystemToken",
    tags: ["Admin", "Ecosystem", "Token"],
    logModule: "ADMIN_ECO",
    logTitle: "Deploy token",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.ecosystemTokenDeploySchema,
            },
        },
    },
    responses: {
        200: {
            description: "Ecosystem token deployed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            record: {
                                type: "object",
                                properties: {
                                    id: { type: "string", description: "Token ID" },
                                    contract: { type: "string", description: "Deployed contract address" },
                                    name: { type: "string", description: "Token name" },
                                    currency: { type: "string", description: "Token currency symbol" },
                                    chain: { type: "string", description: "Blockchain chain" },
                                    network: { type: "string", description: "Network type" },
                                    type: { type: "string", description: "Token type" },
                                    decimals: { type: "number", description: "Token decimals" },
                                    contractType: {
                                        type: "string",
                                        enum: ["PERMIT", "NO_PERMIT", "NATIVE"],
                                        description: "Contract type",
                                    },
                                    status: { type: "boolean", description: "Token status" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: query_1.unauthorizedResponse,
        409: (0, errors_1.conflictResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.ecosystem.token",
};
exports.default = async (data) => {
    var _a, _b;
    const { body, ctx } = data;
    const { name, currency, chain, decimals, status, precision, limits, fee, icon, initialHolder, initialSupply, marketCap, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token deployment parameters");
    const network = process.env[`${chain}_NETWORK`];
    if (!network) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Network not found for chain ${chain}` });
    }
    if (marketCap < 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Market cap cannot be negative" });
    }
    if (initialSupply < 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Initial supply cannot be negative" });
    }
    if (marketCap < initialSupply) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Market cap cannot be less than initial supply" });
    }
    if (initialSupply === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Initial supply cannot be zero" });
    }
    if (!initialHolder) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Initial holder is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving master wallet for chain ${chain}`);
        const masterWallet = await (0, wallet_1.getMasterWalletByChainFull)(chain);
        if (!masterWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Master wallet for chain ${chain} not found` });
        }
        let contract;
        if (chain === "SOL") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Deploying SPL token on Solana");
            const SolanaService = await (0, safe_imports_1.getSolanaService)();
            if (!SolanaService) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Solana service not available" });
            }
            const solanaService = await SolanaService.getInstance();
            contract = await solanaService.deploySplToken(masterWallet, decimals, ctx);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Queueing initial supply minting");
            task_1.taskQueue.add(() => solanaService
                .mintInitialSupply(masterWallet, contract, initialSupply, decimals, initialHolder, ctx)
                .then(() => console.log(`[INFO] Background minting completed for mint ${contract}`))
                .catch(async (err) => {
                await db_1.models.ecosystemToken.destroy({
                    where: { contract },
                });
                console.error(`[ERROR] Background minting failed for mint ${contract}: ${err.message}`);
            }));
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deploying ERC20 token on ${chain}`);
            contract = await (0, tokens_1.deployTokenContract)(masterWallet, chain, name, currency, initialHolder, decimals, initialSupply, marketCap);
        }
        const type = (_b = (_a = chains_1.chainConfigs[chain]) === null || _a === void 0 ? void 0 : _a.smartContract) === null || _b === void 0 ? void 0 : _b.name;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving token to database");
        const result = await (0, query_1.storeRecord)({
            model: "ecosystemToken",
            data: {
                contract,
                name,
                currency,
                chain,
                network,
                type,
                decimals,
                status,
                precision,
                limits: JSON.stringify(limits),
                fee: JSON.stringify(fee),
                icon,
                contractType: "PERMIT",
            },
            returnResponse: true,
        });
        if (result.record && icon) {
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating token icon in cache");
                await (0, utils_1.updateIconInCache)(currency, icon);
            }
            catch (error) {
                ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Failed to update icon in cache: ${error.message}`);
                console.error(`Failed to update icon in cache for ${currency}:`, error);
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Token ${currency} deployed successfully`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to create ecosystem token: ${error.message}` });
    }
};
