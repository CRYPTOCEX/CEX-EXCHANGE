"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEcosystemMasterWalletBalance = exports.createEVMWallet = exports.createAndEncryptWallet = exports.ecosystemMasterWalletStoreSchema = exports.ecosystemMasterWalletUpdateSchema = exports.baseEcosystemMasterWalletSchema = exports.ecosystemMasterWalletSchema = void 0;
exports.getAllMasterWallets = getAllMasterWallets;
exports.getMasterWalletById = getMasterWalletById;
exports.getMasterWallet = getMasterWallet;
exports.createMasterWallet = createMasterWallet;
exports.updateMasterWalletBalance = updateMasterWalletBalance;
exports.deployCustodialContract = deployCustodialContract;
const fs = __importStar(require("fs"));
const utxo_1 = require("@b/api/(ext)/ecosystem/utils/utxo");
const encrypt_1 = require("@b/utils/encrypt");
const schema_1 = require("@b/utils/schema");
const ethers_1 = require("ethers");
const redis_1 = require("@b/utils/redis");
const date_fns_1 = require("date-fns");
const gas_1 = require("@b/api/(ext)/ecosystem/utils/gas");
const db_1 = require("@b/db");
const provider_1 = require("@b/api/(ext)/ecosystem/utils/provider");
const chains_1 = require("@b/api/(ext)/ecosystem/utils/chains");
const smartContract_1 = require("@b/api/(ext)/ecosystem/utils/smartContract");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const safe_imports_1 = require("@b/utils/safe-imports");
const path_1 = __importDefault(require("path"));
const error_1 = require("@b/utils/error");
async function getAllMasterWallets(ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching all master wallets");
    const wallets = await db_1.models.ecosystemMasterWallet.findAll({
        attributes: wallet_1.walletResponseAttributes,
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Found ${wallets.length} master wallet(s)`);
    return wallets;
}
async function getMasterWalletById(id, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching master wallet by ID: ${id}`);
    const wallet = await db_1.models.ecosystemMasterWallet.findOne({
        where: { id },
        attributes: wallet_1.walletResponseAttributes,
    });
    if (wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Master wallet found: ${id}`);
    }
    else {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Master wallet not found: ${id}`);
    }
    return wallet;
}
async function getMasterWallet(id, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching master wallet: ${id}`);
    const wallet = await db_1.models.ecosystemMasterWallet.findOne({
        where: { id },
    });
    if (wallet) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Master wallet retrieved: ${id}`);
    }
    else {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Master wallet not found: ${id}`);
    }
    return wallet;
}
async function createMasterWallet(walletData, currency, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Creating master wallet for ${currency} on ${walletData.chain}`);
    try {
        const wallet = await db_1.models.ecosystemMasterWallet.create({
            currency,
            chain: walletData.chain,
            address: walletData.address,
            data: walletData.data,
            status: true,
            balance: 0,
            lastIndex: 0,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Master wallet created: ${wallet.id}`);
        return wallet;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function updateMasterWalletBalance(id, balance, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating master wallet balance for ${id}: ${balance}`);
    try {
        await db_1.models.ecosystemMasterWallet.update({
            balance,
        }, {
            where: { id },
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Master wallet balance updated: ${id}`);
        return getMasterWalletById(id, ctx);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
const id = (0, schema_1.baseStringSchema)("ID of the ecosystem master wallet");
const chain = (0, schema_1.baseStringSchema)("Blockchain chain associated with the master wallet", 255);
const currency = (0, schema_1.baseStringSchema)("Currency used in the master wallet", 255);
const address = (0, schema_1.baseStringSchema)("Address of the master wallet", 255);
const balance = (0, schema_1.baseNumberSchema)("Balance of the master wallet");
const data = (0, schema_1.baseStringSchema)("Additional data associated with the master wallet", 1000, 0, true);
const status = (0, schema_1.baseEnumSchema)("Operational status of the master wallet", [
    "ACTIVE",
    "INACTIVE",
]);
const lastIndex = (0, schema_1.baseNumberSchema)("Last index used for generating wallet address");
exports.ecosystemMasterWalletSchema = {
    id,
    chain,
    currency,
    address,
    balance,
    data,
    status,
    lastIndex,
};
exports.baseEcosystemMasterWalletSchema = {
    id,
    chain,
    currency,
    address,
    balance,
    data,
    status,
    lastIndex,
};
exports.ecosystemMasterWalletUpdateSchema = {
    type: "object",
    properties: {
        chain,
        currency,
        address,
        balance,
        data,
        status,
        lastIndex,
    },
    required: ["chain", "currency", "address", "status", "lastIndex"],
};
exports.ecosystemMasterWalletStoreSchema = {
    description: `Master wallet created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseEcosystemMasterWalletSchema,
            },
        },
    },
};
const createAndEncryptWallet = async (chain, ctx) => {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Creating and encrypting wallet for ${chain}`);
    let wallet;
    if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
        wallet = (0, utxo_1.createUTXOWallet)(chain);
    }
    else if (chain === "SOL") {
        const SolanaService = await (0, safe_imports_1.getSolanaService)();
        if (!SolanaService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Solana service not available" });
        }
        const solanaService = await SolanaService.getInstance();
        wallet = solanaService.createWallet();
    }
    else if (chain === "TRON") {
        const TronService = await (0, safe_imports_1.getTronService)();
        if (!TronService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Tron service not available" });
        }
        const tronService = await TronService.getInstance();
        wallet = tronService.createWallet();
    }
    else if (chain === "XMR") {
        const MoneroService = await (0, safe_imports_1.getMoneroService)();
        if (!MoneroService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Monero service not available" });
        }
        const moneroService = await MoneroService.getInstance();
        wallet = await moneroService.createWallet("master_wallet");
    }
    else if (chain === "TON") {
        const TonService = await (0, safe_imports_1.getTonService)();
        if (!TonService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "TON service not available" });
        }
        const tonService = await TonService.getInstance();
        wallet = await tonService.createWallet();
    }
    else {
        wallet = (0, exports.createEVMWallet)();
    }
    const possibleWalletDirs = [
        path_1.default.resolve(process.cwd(), "backend", "ecosystem", "wallets"),
        path_1.default.resolve(__dirname, "../../../../../ecosystem", "wallets"),
        path_1.default.resolve(process.cwd(), "ecosystem", "wallets"),
        path_1.default.resolve(__dirname, "../../../../ecosystem", "wallets"),
    ];
    let walletDir = possibleWalletDirs[0];
    for (const possibleDir of possibleWalletDirs) {
        const parentDir = path_1.default.dirname(possibleDir);
        if (fs.existsSync(parentDir)) {
            walletDir = possibleDir;
            console.log(`Using wallet directory: ${walletDir}`);
            break;
        }
    }
    const walletFilePath = `${walletDir}/${chain}.json`;
    if (!fs.existsSync(walletDir)) {
        fs.mkdirSync(walletDir, { recursive: true });
    }
    await fs.writeFileSync(walletFilePath, JSON.stringify(wallet), "utf8");
    const data = (0, encrypt_1.encrypt)(JSON.stringify(wallet.data));
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Wallet created and encrypted for ${chain}: ${wallet.address}`);
    return {
        address: wallet.address,
        chain,
        data,
    };
};
exports.createAndEncryptWallet = createAndEncryptWallet;
const createEVMWallet = () => {
    const wallet = ethers_1.ethers.Wallet.createRandom();
    if (!wallet.mnemonic) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Mnemonic not found" });
    }
    const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(wallet.mnemonic.phrase);
    if (!hdNode) {
        throw (0, error_1.createError)({ statusCode: 500, message: "HDNode not found" });
    }
    const xprv = hdNode.extendedKey;
    const xpub = hdNode.neuter().extendedKey;
    if (!hdNode.mnemonic) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Mnemonic not found" });
    }
    const mnemonic = hdNode.mnemonic.phrase;
    const address = hdNode.address;
    const publicKey = hdNode.publicKey;
    const privateKey = hdNode.privateKey;
    const path = hdNode.path;
    const chainCode = hdNode.chainCode;
    return {
        address,
        data: {
            mnemonic,
            publicKey,
            privateKey,
            xprv,
            xpub,
            chainCode,
            path,
        },
    };
};
exports.createEVMWallet = createEVMWallet;
const getEcosystemMasterWalletBalance = async (wallet, ctx) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching balance for master wallet ${wallet.chain}: ${wallet.address.substring(0, 10)}...`);
    try {
        const cacheKey = `wallet:${wallet.id}:balance`;
        const redis = redis_1.RedisSingleton.getInstance();
        let cachedBalanceData = await redis.get(cacheKey);
        if (cachedBalanceData) {
            if (typeof cachedBalanceData !== "object") {
                cachedBalanceData = JSON.parse(cachedBalanceData);
            }
            const now = new Date();
            const lastUpdated = new Date(cachedBalanceData.timestamp);
            if ((0, date_fns_1.differenceInMinutes)(now, lastUpdated) < 1) {
                return;
            }
        }
        let formattedBalance;
        if (["BTC", "LTC", "DOGE", "DASH"].includes(wallet.chain)) {
            formattedBalance = await (0, utxo_1.fetchUTXOWalletBalance)(wallet.chain, wallet.address);
        }
        else if (wallet.chain === "SOL") {
            const SolanaService = await (0, safe_imports_1.getSolanaService)();
            if (!SolanaService) {
                console.log(`[${wallet.chain}] Solana service module not loaded. Ensure the Solana extension is properly installed.`);
                return;
            }
            try {
                const solanaService = await SolanaService.getInstance();
                formattedBalance = await solanaService.getBalance(wallet.address);
            }
            catch (solError) {
                const errMsg = solError.message || "";
                if (errMsg.includes("not active")) {
                    console.log(`[${wallet.chain}] Solana chain not active. Please ensure:\n` +
                        `  1. SOL_NETWORK is set in your .env (mainnet-beta or devnet)\n` +
                        `  2. SOL_MAINNET_RPC or SOL_DEVNET_RPC is configured with a valid RPC URL`);
                }
                else if (errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch failed")) {
                    console.log(`[${wallet.chain}] Cannot connect to Solana RPC. Check your SOL RPC configuration.`);
                }
                else {
                    console.log(`[${wallet.chain}] Error: ${errMsg.substring(0, 150)}`);
                }
                return;
            }
        }
        else if (wallet.chain === "TRON") {
            const TronService = await (0, safe_imports_1.getTronService)();
            if (!TronService) {
                console.log(`[${wallet.chain}] Tron service module not loaded. Ensure the Tron extension is properly installed.`);
                return;
            }
            try {
                const tronService = await TronService.getInstance();
                formattedBalance = await tronService.getBalance(wallet.address);
            }
            catch (tronError) {
                const errMsg = tronError.message || "";
                if (errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch failed")) {
                    console.log(`[${wallet.chain}] Cannot connect to Tron network. Check your TRON RPC configuration.`);
                }
                else {
                    console.log(`[${wallet.chain}] Error: ${errMsg.substring(0, 150)}`);
                }
                return;
            }
        }
        else if (wallet.chain === "XMR") {
            const MoneroService = await (0, safe_imports_1.getMoneroService)();
            if (!MoneroService) {
                console.log(`[${wallet.chain}] Monero service module not loaded. Ensure the Monero extension is properly installed.`);
                return;
            }
            try {
                const moneroService = await MoneroService.getInstance();
                formattedBalance = await moneroService.getBalance("master_wallet");
            }
            catch (xmrError) {
                if (((_b = xmrError.message) === null || _b === void 0 ? void 0 : _b.includes("not active")) || ((_c = xmrError.message) === null || _c === void 0 ? void 0 : _c.includes("not synchronized"))) {
                    console.log(`[${wallet.chain}] Monero daemon not synchronized. Please ensure:\n` +
                        `  1. Monero daemon (monerod) is running\n` +
                        `  2. XMR_DAEMON_RPC_URL is set correctly (e.g., http://localhost:18081/json_rpc)\n` +
                        `  3. The daemon is fully synchronized with the network`);
                }
                else if (((_d = xmrError.message) === null || _d === void 0 ? void 0 : _d.includes("ECONNREFUSED")) || ((_e = xmrError.message) === null || _e === void 0 ? void 0 : _e.includes("fetch failed"))) {
                    console.log(`[${wallet.chain}] Cannot connect to Monero daemon. Please check:\n` +
                        `  1. Monero daemon (monerod) is running on the configured host/port\n` +
                        `  2. XMR_DAEMON_RPC_URL env variable is correct\n` +
                        `  3. Firewall/network allows the connection`);
                }
                else {
                    console.log(`[${wallet.chain}] Error: ${(_f = xmrError.message) === null || _f === void 0 ? void 0 : _f.substring(0, 150)}`);
                }
                return;
            }
        }
        else if (wallet.chain === "TON") {
            const TonService = await (0, safe_imports_1.getTonService)();
            if (!TonService) {
                console.log(`[${wallet.chain}] TON service module not loaded. Ensure the TON extension is properly installed.`);
                return;
            }
            try {
                const tonService = await TonService.getInstance();
                formattedBalance = await tonService.getBalance(wallet.address);
            }
            catch (tonError) {
                const errMsg = tonError.message || "";
                if (errMsg.includes("not active")) {
                    console.log(`[${wallet.chain}] TON chain not active. Please ensure:\n` +
                        `  1. TON_NETWORK is set in your .env (mainnet or testnet)\n` +
                        `  2. TON API configuration is correct`);
                }
                else if (errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch failed")) {
                    console.log(`[${wallet.chain}] Cannot connect to TON network. Check your TON configuration.`);
                }
                else {
                    console.log(`[${wallet.chain}] Error: ${errMsg.substring(0, 150)}`);
                }
                return;
            }
        }
        else {
            try {
                const provider = await (0, provider_1.getProvider)(wallet.chain);
                const balance = await provider.getBalance(wallet.address);
                const decimals = chains_1.chainConfigs[wallet.chain].decimals;
                formattedBalance = ethers_1.ethers.formatUnits(balance.toString(), decimals);
            }
            catch (providerError) {
                const errMsg = providerError.message || "";
                if (errMsg.includes("NETWORK is not set")) {
                    console.log(`[${wallet.chain}] Missing environment variable: ${wallet.chain}_NETWORK\n` +
                        `  Set it to 'mainnet' or 'testnet' in your .env file`);
                }
                else if (errMsg.includes("_RPC is not set") || errMsg.includes("Environment variable") && errMsg.includes("RPC")) {
                    const network = process.env[`${wallet.chain}_NETWORK`] || "mainnet";
                    console.log(`[${wallet.chain}] Missing RPC URL. Set ${wallet.chain}_${network.toUpperCase()}_RPC in your .env file\n` +
                        `  Example: ${wallet.chain}_${network.toUpperCase()}_RPC=https://your-rpc-endpoint.com`);
                }
                else if (errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch failed") || errMsg.includes("getaddrinfo")) {
                    console.log(`[${wallet.chain}] Cannot connect to RPC endpoint. Please check:\n` +
                        `  1. The RPC URL is correct and accessible\n` +
                        `  2. The RPC service is running\n` +
                        `  3. Network/firewall allows the connection`);
                }
                else if (errMsg.includes("Unsupported chain")) {
                    console.log(`[${wallet.chain}] Chain not configured in chainConfigs. Add configuration for this chain.`);
                }
                else if (errMsg.includes("Chain ID not found")) {
                    console.log(`[${wallet.chain}] Chain ID not configured for the selected network. Check chainConfigs.`);
                }
                else {
                    console.log(`[${wallet.chain}] Provider error: ${errMsg.substring(0, 150)}`);
                }
                return;
            }
        }
        if (!formattedBalance || isNaN(parseFloat(formattedBalance))) {
            console.log(`Invalid formatted balance for ${wallet.chain} wallet: ${formattedBalance}`);
            return;
        }
        const balanceFloat = parseFloat(formattedBalance);
        await updateMasterWalletBalance(wallet.id, balanceFloat, ctx);
        const cacheData = {
            balance: formattedBalance,
            timestamp: new Date().toISOString(),
        };
        await redis.setex(cacheKey, 60, JSON.stringify(cacheData));
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _g === void 0 ? void 0 : _g.call(ctx, `Balance updated for ${wallet.chain}: ${balanceFloat}`);
    }
    catch (error) {
        const errorMsg = `Failed to fetch ${wallet.chain} wallet balance: ${error.message}`;
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _h === void 0 ? void 0 : _h.call(ctx, errorMsg);
        console.error(errorMsg);
    }
};
exports.getEcosystemMasterWalletBalance = getEcosystemMasterWalletBalance;
async function deployCustodialContract(masterWallet, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Deploying custodial contract for ${masterWallet.chain}`);
    try {
        const provider = await (0, provider_1.getProvider)(masterWallet.chain);
        if (!provider) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized" });
        }
        let decryptedData;
        if (!masterWallet.data) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Mnemonic not found" });
        }
        try {
            decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to decrypt mnemonic: ${error.message}` });
        }
        if (!decryptedData || !decryptedData.privateKey) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Decrypted data or Mnemonic not found" });
        }
        const { privateKey } = decryptedData;
        const signer = new ethers_1.ethers.Wallet(privateKey).connect(provider);
        const { abi, bytecode } = await (0, smartContract_1.getSmartContract)("wallet", "CustodialWalletERC20");
        if (!abi || !bytecode) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Smart contract ABI or Bytecode not found" });
        }
        const custodialWalletFactory = new ethers_1.ContractFactory(abi, bytecode, signer);
        const gasPrice = await (0, gas_1.getAdjustedGasPrice)(provider);
        const custodialWalletContract = await custodialWalletFactory.deploy(masterWallet.address, {
            gasPrice: gasPrice,
        });
        const response = await custodialWalletContract.waitForDeployment();
        const contractAddress = await response.getAddress();
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Custodial contract deployed at ${contractAddress}`);
        return contractAddress;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
}
