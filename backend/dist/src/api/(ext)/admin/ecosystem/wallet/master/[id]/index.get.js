"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const provider_1 = require("@b/api/(ext)/ecosystem/utils/provider");
const utxo_1 = require("@b/api/(ext)/ecosystem/utils/utxo");
const ethers_1 = require("ethers");
const chains_1 = require("@b/api/(ext)/ecosystem/utils/chains");
const safe_imports_1 = require("@b/utils/safe-imports");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get master wallet details by ID",
    description: "Retrieves comprehensive information about a specific ecosystem master wallet including its current balance, associated custodial wallets, and configuration details. Balance is fetched in real-time from the blockchain.",
    operationId: "getEcosystemMasterWalletById",
    tags: ["Admin", "Ecosystem", "Wallet"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecosystem master wallet to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Ecosystem master wallet details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseEcosystemMasterWalletSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem Master Wallet"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecosystem.master.wallet",
    requiresAuth: true,
    demoMask: ["address", "ecosystemCustodialWallets.address"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching master wallet details");
    const wallet = await db_1.models.ecosystemMasterWallet.findByPk(params.id, {
        include: [
            {
                model: db_1.models.ecosystemCustodialWallet,
                as: "ecosystemCustodialWallets",
                attributes: ["id", "address", "status"],
            },
        ],
    });
    if (!wallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Ecosystem master wallet not found: ${params.id}` });
    }
    await getWalletBalance(wallet);
    const updatedWallet = await db_1.models.ecosystemMasterWallet.findByPk(params.id, {
        include: [
            {
                model: db_1.models.ecosystemCustodialWallet,
                as: "ecosystemCustodialWallets",
                attributes: ["id", "address", "status"],
            },
        ],
    });
    if (!updatedWallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Ecosystem master wallet not found: ${params.id}` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved master wallet successfully");
    return updatedWallet.get({ plain: true });
};
const getWalletBalance = async (wallet) => {
    var _a, _b, _c;
    try {
        let formattedBalance;
        if (wallet.chain === "SOL") {
            const SolanaService = await (0, safe_imports_1.getSolanaService)();
            if (!SolanaService) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Solana service not available" });
            }
            const solanaService = await SolanaService.getInstance();
            formattedBalance = await solanaService.getBalance(wallet.address);
        }
        else if (wallet.chain === "TRON") {
            const TronService = await (0, safe_imports_1.getTronService)();
            if (!TronService) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Tron service not available" });
            }
            const tronService = await TronService.getInstance();
            formattedBalance = await tronService.getBalance(wallet.address);
        }
        else if (wallet.chain === "XMR") {
            const MoneroService = await (0, safe_imports_1.getMoneroService)();
            if (!MoneroService) {
                console.log(`[${wallet.chain}] Monero service not available - skipping balance fetch`);
                return;
            }
            try {
                const moneroService = await MoneroService.getInstance();
                formattedBalance = await moneroService.getBalance("master_wallet");
            }
            catch (xmrError) {
                if (((_a = xmrError.message) === null || _a === void 0 ? void 0 : _a.includes("not active")) || ((_b = xmrError.message) === null || _b === void 0 ? void 0 : _b.includes("not synchronized"))) {
                    console.log(`[${wallet.chain}] ${xmrError.message} - skipping balance fetch`);
                }
                else {
                    console.log(`[${wallet.chain}] Error fetching balance: ${(_c = xmrError.message) === null || _c === void 0 ? void 0 : _c.substring(0, 100)}`);
                }
                return;
            }
        }
        else if (wallet.chain === "TON") {
            const TonService = await (0, safe_imports_1.getTonService)();
            if (!TonService) {
                throw (0, error_1.createError)({ statusCode: 503, message: "TON service not available" });
            }
            const tonService = await TonService.getInstance();
            formattedBalance = await tonService.getBalance(wallet.address);
        }
        else if (["BTC", "LTC", "DOGE", "DASH"].includes(wallet.chain)) {
            formattedBalance = await (0, utxo_1.fetchUTXOWalletBalance)(wallet.chain, wallet.address);
        }
        else {
            const provider = await (0, provider_1.getProvider)(wallet.chain);
            const balance = await provider.getBalance(wallet.address);
            const decimals = chains_1.chainConfigs[wallet.chain].decimals;
            formattedBalance = ethers_1.ethers.formatUnits(balance.toString(), decimals);
        }
        if (!formattedBalance || isNaN(parseFloat(formattedBalance))) {
            console.error(`Invalid formatted balance for ${wallet.chain} wallet: ${formattedBalance}`);
            return;
        }
        if (parseFloat(formattedBalance) === 0) {
            return;
        }
        await (0, utils_1.updateMasterWalletBalance)(wallet.id, parseFloat(formattedBalance));
    }
    catch (error) {
        console.error(`Failed to fetch ${wallet.chain} wallet balance: ${error.message}`);
    }
};
