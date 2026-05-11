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
exports.updateAlternativeWallet = exports.refundUser = exports.decrementWalletBalance = exports.handleEcosystemDeposit = exports.executeNativeWithdrawal = exports.executePermit = exports.executeNoPermitWithdrawal = exports.executeEcosystemWithdrawal = exports.initializeContracts = exports.getEcosystemTokenOwner = exports.validateEcosystemBalances = exports.validateAddress = exports.generateAndAddAddresses = exports.storeWallet = exports.walletResponseAttributes = void 0;
exports.checkBlockchainExtensions = checkBlockchainExtensions;
exports.getActiveTokensByCurrency = getActiveTokensByCurrency;
exports.getWalletByUserIdAndCurrency = getWalletByUserIdAndCurrency;
exports.getMasterWalletByChain = getMasterWalletByChain;
exports.getMasterWalletByChainFull = getMasterWalletByChainFull;
exports.checkEcosystemAvailableFunds = checkEcosystemAvailableFunds;
exports.getGasPayer = getGasPayer;
exports.getAndValidateTokenOwner = getAndValidateTokenOwner;
exports.getAndValidateNativeTokenOwner = getAndValidateNativeTokenOwner;
exports.getWalletData = getWalletData;
exports.findAlternativeWalletData = findAlternativeWalletData;
exports.getEcosystemPendingTransactions = getEcosystemPendingTransactions;
exports.updatePrivateLedger = updatePrivateLedger;
exports.createPendingTransaction = createPendingTransaction;
exports.updateWalletBalance = updateWalletBalance;
exports.updateWalletForFill = updateWalletForFill;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const encrypt_1 = require("@b/utils/encrypt");
const safe_imports_1 = require("@b/utils/safe-imports");
const ethers_1 = require("ethers");
const tonweb_1 = __importDefault(require("tonweb"));
const blockchain_1 = require("./blockchain");
const gas_1 = require("./gas");
const tokens_1 = require("./tokens");
const smartContract_1 = require("./smartContract");
const chains_1 = require("./chains");
const custodialWallet_1 = require("./custodialWallet");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const uuid_1 = require("uuid");
async function checkBlockchainExtensions() {
    const solanaService = await (0, safe_imports_1.getSolanaService)();
    const tronService = await (0, safe_imports_1.getTronService)();
    const moneroService = await (0, safe_imports_1.getMoneroService)();
    const tonService = await (0, safe_imports_1.getTonService)();
    return {
        solana: (0, safe_imports_1.isServiceAvailable)(solanaService),
        tron: (0, safe_imports_1.isServiceAvailable)(tronService),
        monero: (0, safe_imports_1.isServiceAvailable)(moneroService),
        ton: (0, safe_imports_1.isServiceAvailable)(tonService),
    };
}
exports.walletResponseAttributes = [
    "id",
    "currency",
    "chain",
    "address",
    "status",
    "balance",
];
const web3_js_1 = require("@solana/web3.js");
const utxo_1 = require("./utxo");
async function getActiveTokensByCurrency(currency) {
    const tokens = await db_1.models.ecosystemToken.findAll({
        where: { currency, status: true },
    });
    const filteredTokens = tokens.filter((token) => {
        const specialChains = ['XMR', 'TON', 'SOL', 'TRON', 'BTC', 'LTC', 'DOGE', 'DASH'];
        if (specialChains.includes(token.chain)) {
            return true;
        }
        const chainEnvVar = `${token.chain.toUpperCase()}_NETWORK`;
        const expectedNetwork = process.env[chainEnvVar];
        if (!expectedNetwork) {
            return false;
        }
        if (token.network === expectedNetwork) {
            return true;
        }
        const networkMappings = {
            'BSC': 'mainnet',
            'ETH': 'mainnet',
            'POLYGON': 'mainnet',
            'ARBITRUM': 'mainnet',
            'OPTIMISM': 'mainnet',
            'AVALANCHE': 'mainnet',
            'FANTOM': 'mainnet'
        };
        if (token.network === token.chain && expectedNetwork === 'mainnet') {
            return true;
        }
        if (networkMappings[token.chain] === token.network && expectedNetwork === 'mainnet') {
            return true;
        }
        return false;
    });
    if (filteredTokens.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "No enabled tokens found for this currency",
        });
    }
    return filteredTokens;
}
async function getWalletByUserIdAndCurrency(userId, currency, type = "ECO", transaction, lock) {
    let wallet = await db_1.models.wallet.findOne({
        where: {
            userId,
            currency,
            type,
        },
        attributes: ["id", "userId", "type", "currency", "balance", "inOrder", "address"],
        ...(transaction && { transaction }),
        ...(transaction && lock && { lock: transaction.LOCK.UPDATE }),
    });
    if (type === "COPY_TRADING") {
        return wallet;
    }
    if (!wallet) {
        const newWallet = await (0, exports.storeWallet)({ id: userId }, currency);
        if (newWallet) {
            wallet = newWallet;
        }
    }
    if (!wallet) {
        throw (0, error_1.createError)(404, "Wallet not found");
    }
    const tokens = await getActiveTokensByCurrency(currency);
    let addresses = {};
    try {
        if (wallet.address) {
            if (typeof wallet.address === "string") {
                addresses = JSON.parse(wallet.address);
            }
            else {
                addresses = wallet.address;
            }
            if (typeof addresses === "string") {
                addresses = JSON.parse(addresses);
            }
        }
    }
    catch (error) {
        console_1.logger.error("WALLET", `Failed to parse wallet address for wallet ${wallet.id}: ${error.message}`);
        console_1.logger.debug("WALLET", `Raw address value: ${wallet.address}`);
        if (typeof wallet.address === "string") {
            try {
                const addressStr = wallet.address;
                const repairedAddress = addressStr.replace(/"(\w+)"(\d+\.?\d*)/g, '"$1":$2');
                addresses = JSON.parse(repairedAddress);
                console_1.logger.success("WALLET", `Repaired corrupted wallet address JSON for wallet ${wallet.id}`);
                await db_1.models.wallet.update({ address: JSON.stringify(addresses) }, { where: { id: wallet.id } });
            }
            catch (repairError) {
                console_1.logger.error("WALLET", `Failed to repair wallet address: ${repairError.message}`);
                addresses = {};
            }
        }
    }
    if (!addresses ||
        (addresses && Object.keys(addresses).length < tokens.length)) {
        const tokensWithoutAddress = tokens.filter((token) => !addresses || !addresses.hasOwnProperty(token.chain));
        if (tokensWithoutAddress.length > 0) {
            await db_1.sequelize.transaction(async (transaction) => {
                await (0, exports.generateAndAddAddresses)(wallet, tokensWithoutAddress, transaction);
            });
        }
        const updatedWallet = await db_1.models.wallet.findOne({
            where: { id: wallet.id },
            attributes: ["id", "userId", "type", "currency", "balance", "inOrder", "address"],
        });
        if (!updatedWallet) {
            throw (0, error_1.createError)(500, "Failed to update wallet with new addresses");
        }
        return updatedWallet;
    }
    return wallet;
}
const storeWallet = async (user, currency) => {
    const tokens = await getActiveTokensByCurrency(currency);
    if (!tokens.length) {
        handleError("No enabled tokens found for this currency");
    }
    try {
        (0, encrypt_1.encrypt)("test");
    }
    catch (error) {
        handleError("Encryption key is not set");
    }
    return await db_1.sequelize.transaction(async (transaction) => {
        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "ECO", currency, transaction);
        const wallet = walletResult.wallet;
        let addresses = wallet.address
            ? typeof wallet.address === "string"
                ? JSON.parse(wallet.address)
                : wallet.address
            : {};
        if (typeof addresses === "string") {
            addresses = JSON.parse(addresses);
        }
        if (addresses && Object.keys(addresses).length > 0) {
            return await db_1.models.wallet.findByPk(wallet.id, { transaction });
        }
        const walletModel = await db_1.models.wallet.findByPk(wallet.id, { transaction });
        if (!walletModel) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to retrieve wallet for address generation" });
        }
        return await (0, exports.generateAndAddAddresses)(walletModel, tokens, transaction);
    });
};
exports.storeWallet = storeWallet;
const generateAndAddAddresses = async (wallet, tokens, transaction) => {
    let addresses = wallet.address
        ? typeof wallet.address === "string"
            ? JSON.parse(wallet.address)
            : wallet.address
        : {};
    if (typeof addresses === "string") {
        addresses = JSON.parse(addresses);
    }
    for (const token of tokens) {
        try {
            switch (token.contractType) {
                case "PERMIT":
                    if (token.chain === "SOL") {
                        await handleSolanaWallet(wallet, addresses, transaction);
                    }
                    else {
                        await handlePermitContract(token, wallet, addresses, transaction);
                    }
                    break;
                case "NO_PERMIT":
                    await handleNoPermitContract(token, wallet, addresses);
                    break;
                case "NATIVE":
                    if (token.chain === "SOL") {
                        await handleSolanaNativeWallet(wallet, addresses, transaction);
                    }
                    else if (token.chain === "TRON") {
                        await handleTronNativeWallet(wallet, addresses, transaction);
                    }
                    else if (token.chain === "XMR") {
                        await handleMoneroNativeWallet(wallet, addresses, transaction);
                    }
                    else if (token.chain === "TON") {
                        await handleTonNativeWallet(wallet, addresses, transaction);
                    }
                    else {
                        await handleNativeContract(token, wallet, addresses, transaction);
                    }
                    break;
                default:
                    handleError(`Unknown contract type for token ${token.name}`, false);
            }
        }
        catch (error) {
            handleError(`Failed to generate address for token ${token.name}: ${error.message}`, false);
        }
    }
    if (Object.keys(addresses).length === 0) {
        handleError("Failed to generate any addresses for the wallet");
    }
    await db_1.models.wallet.update({ address: JSON.stringify(addresses) }, {
        where: { id: wallet.id },
        transaction,
    });
    const updatedWallet = await db_1.models.wallet.findOne({
        where: { id: wallet.id },
        transaction,
    });
    if (!updatedWallet) {
        handleError("Failed to update wallet with new addresses");
    }
    return updatedWallet;
};
exports.generateAndAddAddresses = generateAndAddAddresses;
const handleNativeContract = async (token, newWallet, addresses, transaction) => {
    let encryptedWalletData;
    if (["BTC", "LTC", "DOGE", "DASH"].includes(token.chain)) {
        const wallet = (0, utxo_1.createUTXOWallet)(token.chain);
        addresses[token.chain] = {
            address: wallet.address,
            network: token.network,
            balance: 0,
        };
        encryptedWalletData = (0, encrypt_1.encrypt)(JSON.stringify(wallet.data));
    }
    else {
        const wallet = ethers_1.ethers.Wallet.createRandom();
        if (!wallet.mnemonic)
            throw (0, error_1.createError)({ statusCode: 500, message: "Mnemonic not found" });
        const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(wallet.mnemonic.phrase);
        addresses[token.chain] = {
            address: hdNode.address,
            network: token.network,
            balance: 0,
        };
        if (!hdNode.mnemonic)
            throw (0, error_1.createError)({ statusCode: 500, message: "Mnemonic not found" });
        encryptedWalletData = (0, encrypt_1.encrypt)(JSON.stringify({
            mnemonic: hdNode.mnemonic.phrase,
            publicKey: hdNode.publicKey,
            privateKey: hdNode.privateKey,
            xprv: hdNode.extendedKey,
            xpub: hdNode.neuter().extendedKey,
            chainCode: hdNode.chainCode,
            path: hdNode.path,
        }));
    }
    const walletData = await db_1.models.walletData.findOne({
        where: {
            walletId: newWallet.id,
            currency: token.currency,
            chain: token.chain,
        },
        transaction,
    });
    if (walletData) {
        await walletData.update({
            balance: 0,
            index: 0,
            data: encryptedWalletData,
        }, transaction);
    }
    else {
        await db_1.models.walletData.create({
            walletId: newWallet.id,
            currency: token.currency,
            chain: token.chain,
            balance: 0,
            index: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
};
const handleSolanaNativeWallet = async (wallet, addresses, transaction) => {
    const SolanaService = await (0, safe_imports_1.getSolanaService)();
    if (!SolanaService) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Solana service not available" });
    }
    const solanaService = await SolanaService.getInstance();
    const { address, data } = solanaService.createWallet();
    addresses["SOL"] = {
        address,
        network: process.env.SOLANA_NETWORK || "mainnet",
        balance: 0,
    };
    const encryptedWalletData = (0, encrypt_1.encrypt)(JSON.stringify(data));
    const walletData = await db_1.models.walletData.findOne({
        where: {
            walletId: wallet.id,
            currency: "SOL",
            chain: "SOL",
        },
        transaction,
    });
    if (walletData) {
        await walletData.update({
            balance: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
    else {
        await db_1.models.walletData.create({
            walletId: wallet.id,
            currency: "SOL",
            chain: "SOL",
            balance: 0,
            index: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
};
const handleSolanaWallet = async (wallet, addresses, transaction) => {
    const SolanaService = await (0, safe_imports_1.getSolanaService)();
    if (!SolanaService) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Solana service not available" });
    }
    const solanaService = await SolanaService.getInstance();
    const { address, data } = solanaService.createWallet();
    addresses["SOL"] = {
        address,
        network: process.env.SOLANA_NETWORK || "mainnet",
        balance: 0,
    };
    const encryptedWalletData = (0, encrypt_1.encrypt)(JSON.stringify(data));
    const walletData = await db_1.models.walletData.findOne({
        where: {
            walletId: wallet.id,
            currency: wallet.currency,
            chain: "SOL",
        },
        transaction,
    });
    if (walletData) {
        await walletData.update({
            balance: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
    else {
        await db_1.models.walletData.create({
            walletId: wallet.id,
            currency: wallet.currency,
            chain: "SOL",
            balance: 0,
            index: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
};
const handleTronNativeWallet = async (wallet, addresses, transaction) => {
    const TronService = await (0, safe_imports_1.getTronService)();
    if (!TronService) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Tron service not available" });
    }
    const tronService = await TronService.getInstance();
    const { address, data } = tronService.createWallet();
    addresses["TRON"] = {
        address,
        network: process.env.TRON_NETWORK || "mainnet",
        balance: 0,
    };
    const encryptedWalletData = (0, encrypt_1.encrypt)(JSON.stringify(data));
    const walletData = await db_1.models.walletData.findOne({
        where: {
            walletId: wallet.id,
            currency: "TRX",
            chain: "TRON",
        },
        transaction,
    });
    if (walletData) {
        await walletData.update({
            balance: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
    else {
        await db_1.models.walletData.create({
            walletId: wallet.id,
            currency: "TRX",
            chain: "TRON",
            balance: 0,
            index: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
};
const handleMoneroNativeWallet = async (wallet, addresses, transaction) => {
    const MoneroService = await (0, safe_imports_1.getMoneroService)();
    if (!MoneroService) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Monero service not available" });
    }
    const moneroService = await MoneroService.getInstance();
    const { address, data } = await moneroService.createWallet(wallet.id);
    addresses["XMR"] = {
        address,
        network: process.env.MONERO_NETWORK || "mainnet",
        balance: 0,
    };
    const encryptedWalletData = (0, encrypt_1.encrypt)(JSON.stringify(data));
    const walletData = await db_1.models.walletData.findOne({
        where: {
            walletId: wallet.id,
            currency: "XMR",
            chain: "XMR",
        },
        transaction,
    });
    if (walletData) {
        await walletData.update({
            balance: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
    else {
        await db_1.models.walletData.create({
            walletId: wallet.id,
            currency: "XMR",
            chain: "XMR",
            balance: 0,
            index: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
};
const handleTonNativeWallet = async (wallet, addresses, transaction) => {
    const TonService = await (0, safe_imports_1.getTonService)();
    if (!TonService) {
        throw (0, error_1.createError)({ statusCode: 500, message: "TON service not available" });
    }
    const tonService = await TonService.getInstance();
    const { address, data } = await tonService.createWallet();
    addresses["TON"] = {
        address,
        network: process.env.TON_NETWORK || "mainnet",
        balance: 0,
    };
    const encryptedWalletData = (0, encrypt_1.encrypt)(JSON.stringify(data));
    const walletData = await db_1.models.walletData.findOne({
        where: {
            walletId: wallet.id,
            currency: "TON",
            chain: "TON",
        },
        transaction,
    });
    if (walletData) {
        await walletData.update({
            balance: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
    else {
        await db_1.models.walletData.create({
            walletId: wallet.id,
            currency: "TON",
            chain: "TON",
            balance: 0,
            index: 0,
            data: encryptedWalletData,
        }, { transaction });
    }
};
const handleError = (message, throwIt = true) => {
    console_1.logger.error("WALLET", message);
    if (throwIt) {
        throw (0, error_1.createError)({ statusCode: 500, message });
    }
};
const handlePermitContract = async (token, newWallet, addresses, transaction) => {
    const masterWallet = await db_1.models.ecosystemMasterWallet.findOne({
        where: { chain: token.chain, status: true },
        transaction,
    });
    if (!masterWallet || !masterWallet.data) {
        console_1.logger.warn("WALLET", `Skipping chain ${token.chain} - Master wallet not found or not enabled`);
        return;
    }
    const nextIndex = masterWallet.lastIndex != null ? masterWallet.lastIndex + 1 : 1;
    await db_1.models.ecosystemMasterWallet.update({ lastIndex: nextIndex }, {
        where: { id: masterWallet.id },
        transaction,
    });
    const decryptedMasterData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
    const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(decryptedMasterData.mnemonic);
    const childNode = hdNode.deriveChild(nextIndex);
    if (!childNode.address) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Address failed to generate" });
    }
    addresses[token.chain] = {
        address: childNode.address,
        network: token.network,
        balance: 0,
    };
    const encryptedChildData = (0, encrypt_1.encrypt)(JSON.stringify({
        address: childNode.address,
        publicKey: childNode.publicKey,
        privateKey: childNode.privateKey,
    }));
    const walletData = await db_1.models.walletData.findOne({
        where: {
            walletId: newWallet.id,
            currency: token.currency,
            chain: token.chain,
        },
        transaction,
    });
    if (walletData) {
        await walletData.update({
            balance: 0,
            index: nextIndex,
            data: encryptedChildData,
        }, { transaction });
    }
    else {
        await db_1.models.walletData.create({
            walletId: newWallet.id,
            currency: token.currency,
            chain: token.chain,
            balance: 0,
            index: nextIndex,
            data: encryptedChildData,
        }, { transaction });
    }
};
const handleNoPermitContract = async (token, newWallet, addresses) => {
    addresses[token.chain] = {
        balance: 0,
    };
};
async function getMasterWalletByChain(chain) {
    try {
        return await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain },
            attributes: exports.walletResponseAttributes,
        });
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to get master wallet by chain", error);
        throw error;
    }
}
async function getMasterWalletByChainFull(chain) {
    try {
        const wallet = await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain },
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Master wallet not found for chain: ${chain}` });
        }
        return wallet;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to get master wallet by chain", error);
        throw error;
    }
}
async function checkEcosystemAvailableFunds(userWallet, walletData, totalAmount) {
    try {
        console_1.logger.debug("WALLET", `Checking funds availability: walletId=${userWallet.id}, totalAmount=${totalAmount}, currentBalance=${userWallet.balance}`);
        const totalAvailable = await getTotalAvailable(userWallet, walletData);
        console_1.logger.debug("WALLET", `Total available: ${totalAvailable}`);
        if (totalAvailable < totalAmount) {
            console_1.logger.error("WALLET", `Insufficient funds: available ${totalAvailable} < required ${totalAmount}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds for withdrawal including fee" });
        }
        return totalAvailable;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Error checking funds", error);
        if (error.statusCode === 400) {
            throw error;
        }
        throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal failed - please try again later" });
    }
}
const getTotalAvailable = async (userWallet, walletData) => {
    const network = process.env[`${walletData.chain}_NETWORK`] || "mainnet";
    const pvEntry = await db_1.models.ecosystemPrivateLedger.findOne({
        where: {
            walletId: userWallet.id,
            index: walletData.index,
            currency: userWallet.currency,
            chain: walletData.chain,
            network,
        },
    });
    return userWallet.balance + (pvEntry ? pvEntry.offchainDifference : 0);
};
async function getGasPayer(chain, provider) {
    try {
        console_1.logger.debug("WALLET", `Getting gas payer for chain: ${chain}`);
        const masterWallet = await getMasterWalletByChainFull(chain);
        if (!masterWallet) {
            console_1.logger.error("WALLET", `Master wallet not found for chain: ${chain}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Master wallet not found" });
        }
        const { data } = masterWallet;
        if (!data) {
            console_1.logger.error("WALLET", `Master wallet data not found for chain: ${chain}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Master wallet data not found" });
        }
        console_1.logger.debug("WALLET", `Decrypting master wallet data`);
        const decryptedMasterData = JSON.parse((0, encrypt_1.decrypt)(data));
        return new ethers_1.ethers.Wallet(decryptedMasterData.privateKey, provider);
    }
    catch (error) {
        console_1.logger.error("WALLET", "Error getting gas payer", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal failed - please try again later" });
    }
}
const validateAddress = (toAddress, chain) => {
    if (chain === "SOL") {
        try {
            new web3_js_1.PublicKey(toAddress);
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid Solana address: ${toAddress}` });
        }
    }
    else if (chain === "TRON") {
        if (!toAddress.startsWith("T")) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid Tron address: ${toAddress}` });
        }
    }
    else if (chain === "XMR") {
        if (!toAddress.startsWith("4") && !toAddress.startsWith("8")) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid Monero address: ${toAddress}` });
        }
    }
    else if (chain === "TON") {
        try {
            const tonAddress = new tonweb_1.default.utils.Address(toAddress);
            if (!tonAddress || !tonAddress.toString()) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Invalid TON address: ${toAddress}` });
            }
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid TON address: ${toAddress}` });
        }
    }
    else {
        if (!ethers_1.ethers.isAddress(toAddress)) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid target wallet address: ${toAddress}` });
        }
    }
};
exports.validateAddress = validateAddress;
const validateEcosystemBalances = async (tokenContract, actualTokenOwner, amount) => {
    try {
        const tokenOwnerBalance = (await tokenContract.balanceOf(actualTokenOwner.address)).toString();
        if (tokenOwnerBalance < amount) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds in the wallet for withdrawal" });
        }
        return true;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to validate ecosystem balances", error);
        throw error;
    }
};
exports.validateEcosystemBalances = validateEcosystemBalances;
const getEcosystemTokenOwner = (walletData, provider) => {
    const { data } = walletData;
    const decryptedData = JSON.parse((0, encrypt_1.decrypt)(data));
    const { privateKey } = decryptedData;
    return new ethers_1.ethers.Wallet(privateKey, provider);
};
exports.getEcosystemTokenOwner = getEcosystemTokenOwner;
const initializeContracts = async (chain, currency, provider) => {
    try {
        const { contractAddress, contractType, tokenDecimals } = await (0, tokens_1.getTokenContractAddress)(chain, currency);
        const gasPayer = await getGasPayer(chain, provider);
        const { abi } = await (0, smartContract_1.getSmartContract)("token", "ERC20");
        const contract = new ethers_1.ethers.Contract(contractAddress, abi, provider);
        return {
            contract,
            contractAddress,
            gasPayer,
            contractType,
            tokenDecimals,
        };
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to initialize contracts", error);
        throw error;
    }
};
exports.initializeContracts = initializeContracts;
const executeEcosystemWithdrawal = async (tokenContract, tokenContractAddress, gasPayer, tokenOwner, toAddress, amount, provider) => {
    try {
        const gasPrice = await (0, gas_1.getAdjustedGasPrice)(provider);
        const transferFromTransaction = {
            to: tokenContractAddress,
            from: gasPayer.address,
            data: tokenContract.interface.encodeFunctionData("transferFrom", [
                tokenOwner.address,
                toAddress,
                amount,
            ]),
        };
        const gasLimitForTransferFrom = await (0, gas_1.estimateGas)(transferFromTransaction, provider);
        const trx = await tokenContract
            .connect(gasPayer)
            .getFunction("transferFrom")
            .send(tokenOwner.address, toAddress, amount, {
            gasPrice: gasPrice,
            gasLimit: gasLimitForTransferFrom,
        });
        await trx.wait(2);
        return trx;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to execute ecosystem withdrawal", error);
        throw error;
    }
};
exports.executeEcosystemWithdrawal = executeEcosystemWithdrawal;
const executeNoPermitWithdrawal = async (chain, tokenContractAddress, gasPayer, toAddress, amount, provider, isNative) => {
    try {
        const custodialWallets = await (0, custodialWallet_1.getActiveCustodialWallets)(chain);
        if (!custodialWallets || custodialWallets.length === 0) {
            throw (0, error_1.createError)({ statusCode: 404, message: "No custodial wallets found" });
        }
        let tokenOwner, custodialContract, custodialContractAddress;
        for (const custodialWallet of custodialWallets) {
            const custodialWalletContract = await (0, custodialWallet_1.getCustodialWalletContract)(custodialWallet.address, provider);
            const balance = await (0, custodialWallet_1.getCustodialWalletTokenBalance)(custodialWalletContract, tokenContractAddress);
            if (BigInt(balance) >= amount) {
                tokenOwner = custodialWallet;
                custodialContract = custodialWalletContract;
                custodialContractAddress = custodialWallet.address;
                break;
            }
        }
        if (!tokenOwner) {
            throw (0, error_1.createError)({ statusCode: 404, message: "No custodial wallets found" });
        }
        let trx;
        if (isNative) {
            trx = await custodialContract
                .connect(gasPayer)
                .getFunction("transferNative")
                .send(toAddress, amount);
        }
        else {
            trx = await custodialContract
                .connect(gasPayer)
                .getFunction("transferTokens")
                .send(tokenContractAddress, toAddress, amount);
        }
        await trx.wait(2);
        return trx;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to execute no permit withdrawal", error);
        throw error;
    }
};
exports.executeNoPermitWithdrawal = executeNoPermitWithdrawal;
async function getAndValidateTokenOwner(walletData, amountEth, tokenContract, provider) {
    try {
        let alternativeWalletUsed = false;
        const tokenOwner = await (0, exports.getEcosystemTokenOwner)(walletData, provider);
        let actualTokenOwner = tokenOwner;
        let alternativeWallet = null;
        const onChainBalance = await tokenContract.balanceOf(tokenOwner.address);
        if (onChainBalance < amountEth) {
            const alternativeWalletData = await findAlternativeWalletData(walletData, (0, blockchain_1.fromBigInt)(amountEth));
            alternativeWallet = alternativeWalletData;
            actualTokenOwner = (0, exports.getEcosystemTokenOwner)(alternativeWalletData, provider);
            alternativeWalletUsed = true;
        }
        (0, exports.validateEcosystemBalances)(tokenContract, actualTokenOwner, amountEth);
        return { actualTokenOwner, alternativeWalletUsed, alternativeWallet };
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to get and validate token owner", error);
        throw error;
    }
}
const executePermit = async (tokenContract, tokenContractAddress, gasPayer, tokenOwner, amount, provider) => {
    try {
        const nonce = await tokenContract.nonces(tokenOwner.address);
        const deadline = (0, chains_1.getTimestampInSeconds)() + 4200;
        const domain = {
            chainId: await (0, chains_1.getChainId)(provider),
            name: await tokenContract.name(),
            verifyingContract: tokenContractAddress,
            version: "1",
        };
        const types = {
            Permit: [
                {
                    name: "owner",
                    type: "address",
                },
                {
                    name: "spender",
                    type: "address",
                },
                {
                    name: "value",
                    type: "uint256",
                },
                {
                    name: "nonce",
                    type: "uint256",
                },
                {
                    name: "deadline",
                    type: "uint256",
                },
            ],
        };
        const values = {
            owner: tokenOwner.address,
            spender: gasPayer.address,
            value: amount,
            nonce: nonce,
            deadline: deadline,
        };
        const signature = await tokenOwner.signTypedData(domain, types, values);
        const sig = ethers_1.ethers.Signature.from(signature);
        const recovered = ethers_1.ethers.verifyTypedData(domain, types, values, sig);
        if (recovered !== tokenOwner.address) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid signature" });
        }
        const gasPrice = await (0, gas_1.getAdjustedGasPrice)(provider);
        const permitTransaction = {
            to: tokenContractAddress,
            from: tokenOwner.address,
            nonce: nonce,
            data: tokenContract.interface.encodeFunctionData("permit", [
                tokenOwner.address,
                gasPayer.address,
                amount,
                deadline,
                sig.v,
                sig.r,
                sig.s,
            ]),
        };
        const gasLimitForPermit = await (0, gas_1.estimateGas)(permitTransaction, provider);
        const gasPayerBalance = (await tokenContract.balanceOf(gasPayer.address)).toString();
        if (BigInt(gasPayerBalance) <
            BigInt(gasLimitForPermit) * gasPrice * BigInt(2)) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal failed, Please contact support team." });
        }
        const tx = await tokenContract
            .connect(gasPayer)
            .getFunction("permit")
            .send(tokenOwner.address, gasPayer.address, amount, deadline, sig.v, sig.r, sig.s, {
            gasPrice: gasPrice,
            gasLimit: gasLimitForPermit,
        });
        await tx.wait(2);
        return tx;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to execute permit", error);
        throw error;
    }
};
exports.executePermit = executePermit;
const executeNativeWithdrawal = async (payer, toAddress, amount, provider) => {
    try {
        console_1.logger.info("EVM_WITHDRAW", `Checking balance for ${payer.address}...`);
        const balance = await provider.getBalance(payer.address);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt(0);
        const gasLimit = BigInt(21000);
        const gasCost = gasPrice * gasLimit;
        console_1.logger.info("EVM_WITHDRAW", `Balance: ${balance}, required: ${amount}, gasCost: ${gasCost}, gasPrice: ${gasPrice}`);
        if (balance < amount + gasCost) {
            const adjustedAmount = balance - gasCost;
            if (adjustedAmount <= BigInt(0)) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Insufficient funds: balance ${balance} cannot cover gas cost ${gasCost}` });
            }
            console_1.logger.warn("EVM_WITHDRAW", `Adjusting withdrawal amount from ${amount} to ${adjustedAmount} to cover gas (${gasCost})`);
            amount = adjustedAmount;
        }
        const tx = {
            to: toAddress,
            value: amount,
            gasLimit: gasLimit,
        };
        if (feeData.gasPrice) {
            tx.gasPrice = feeData.gasPrice;
            tx.type = 0;
        }
        console_1.logger.info("EVM_WITHDRAW", `Sending transaction to ${toAddress} with value=${amount}, gasLimit=${gasLimit}, gasPrice=${tx.gasPrice || 'auto'}...`);
        const response = await payer.sendTransaction(tx);
        console_1.logger.info("EVM_WITHDRAW", `Transaction broadcast: ${response.hash}, waiting for 2 confirmations...`);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`WITHDRAWAL_STATUS_UNKNOWN: Transaction ${response.hash} broadcast but confirmation timed out after 300s. Manual review required.`)), 300000));
        await Promise.race([response.wait(2), timeoutPromise]);
        console_1.logger.success("EVM_WITHDRAW", `Transaction ${response.hash} confirmed`);
        return response;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to execute native withdrawal", error);
        throw error;
    }
};
exports.executeNativeWithdrawal = executeNativeWithdrawal;
async function getAndValidateNativeTokenOwner(walletData, amountEth, provider) {
    try {
        const tokenOwner = await (0, exports.getEcosystemTokenOwner)(walletData, provider);
        const onChainBalance = await provider.getBalance(tokenOwner.address);
        if (onChainBalance < amountEth) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds in the wallet for withdrawal" });
        }
        return tokenOwner;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to get and validate native token owner", error);
        throw error;
    }
}
async function getWalletData(walletId, chain) {
    try {
        return await db_1.models.walletData.findOne({
            where: {
                walletId: walletId,
                chain: chain,
            },
        });
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to get wallet data", error);
        throw error;
    }
}
async function findAlternativeWalletData(walletData, amount) {
    try {
        const { QueryTypes } = await Promise.resolve().then(() => __importStar(require("sequelize")));
        const { sequelize } = await Promise.resolve().then(() => __importStar(require("@b/db")));
        const network = process.env[`${walletData.chain}_NETWORK`] || "mainnet";
        const result = await sequelize.query(`
      SELECT wd.*,
             COALESCE(epl.offchainDifference, 0) as offchainDiff,
             COALESCE(w.balance, 0) as walletBalance,
             GREATEST(
               wd.balance - COALESCE(epl.offchainDifference, 0),
               COALESCE(w.balance, 0) - COALESCE(epl.offchainDifference, 0)
             ) as availableBalance
      FROM wallet_data wd
      LEFT JOIN ecosystem_private_ledger epl
        ON wd.walletId = epl.walletId
        AND wd.chain = epl.chain
        AND wd.currency = epl.currency
        AND epl.network = :network
      LEFT JOIN wallet w
        ON wd.walletId = w.id
      WHERE wd.currency = :currency
        AND wd.chain = :chain
        AND GREATEST(
              wd.balance - COALESCE(epl.offchainDifference, 0),
              COALESCE(w.balance, 0) - COALESCE(epl.offchainDifference, 0)
            ) >= :amount
      ORDER BY availableBalance DESC
      LIMIT 1
    `, {
            replacements: {
                currency: walletData.currency,
                chain: walletData.chain,
                amount,
                network
            },
            type: QueryTypes.SELECT,
        });
        if (!result || result.length === 0) {
            console_1.logger.error("WALLET", `No alternative wallet found: currency=${walletData.currency}, chain=${walletData.chain}, amount=${amount}`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "No alternative wallet with sufficient available balance found"
            });
        }
        console_1.logger.info("WALLET", `Alternative wallet selected: walletId=${result[0].walletId}, walletDataBalance=${result[0].balance}, walletBalance=${result[0].walletBalance}, offchainDiff=${result[0].offchainDiff}, available=${result[0].availableBalance}`);
        return result[0];
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to find alternative wallet data", error);
        throw error;
    }
}
async function getEcosystemPendingTransactions() {
    try {
        return await db_1.models.transaction.findAll({
            where: {
                type: "WITHDRAW",
                status: "PENDING",
            },
            include: [{ model: db_1.models.wallet, where: { type: "ECO" } }],
        });
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to get ecosystem pending transactions", error);
        throw error;
    }
}
const handleEcosystemDeposit = async (trx) => {
    try {
        const wallet = await db_1.models.wallet.findOne({
            where: { id: trx.id },
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        const existingTransaction = await db_1.models.transaction.findOne({
            where: {
                trxId: trx.hash,
                walletId: wallet.id,
            },
        });
        if (existingTransaction) {
            throw (0, error_1.createError)({ statusCode: 409, message: "Transaction already processed for this wallet" });
        }
        const addresses = JSON.parse(wallet.address);
        const chainAddress = addresses[trx.chain];
        if (!chainAddress) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Address not found for the given chain" });
        }
        const depositAmount = parseFloat(trx.amount);
        console_1.logger.debug("DEPOSIT", `Processing deposit for wallet ${wallet.id}`);
        console_1.logger.debug("DEPOSIT", `Current wallet balance: ${wallet.balance} ${wallet.currency}`);
        console_1.logger.debug("DEPOSIT", `Current chain balance: ${chainAddress.balance || 0} ${wallet.currency}`);
        console_1.logger.debug("DEPOSIT", `Deposit amount (trx.amount): ${trx.amount} ${wallet.currency}`);
        console_1.logger.debug("DEPOSIT", `Parsed deposit amount: ${depositAmount} ${wallet.currency}`);
        let fee = 0;
        const utxoChains = ["BTC", "DOGE", "LTC", "DASH"];
        if (utxoChains.includes(trx.chain)) {
            const totalInputValue = trx.inputs.reduce((sum, input) => {
                const inputValue = input.output_value || input.value || 0;
                return sum + parseFloat(inputValue);
            }, 0);
            const totalOutputValue = trx.outputs.reduce((sum, output) => {
                const outputValue = output.value || 0;
                return sum + parseFloat(outputValue);
            }, 0);
            fee = totalInputValue - totalOutputValue;
        }
        else {
            if (!isNaN(parseFloat(trx.gasUsed)) && !isNaN(parseFloat(trx.gasPrice))) {
                fee = parseFloat(trx.gasUsed) * parseFloat(trx.gasPrice);
            }
            else {
                fee = 0;
            }
        }
        const idempotencyKey = `eco_deposit_${trx.hash}_${wallet.id}`;
        const result = await wallet_1.walletService.ecoCredit({
            idempotencyKey,
            userId: wallet.userId,
            walletId: wallet.id,
            currency: wallet.currency,
            chain: trx.chain,
            amount: depositAmount,
            operationType: "ECO_DEPOSIT",
            fee,
            description: `Deposit of ${trx.amount} ${wallet.currency} from ${Array.isArray(trx.from) ? trx.from[0] || 'Unknown' : trx.from || 'Unknown'}`,
            txHash: trx.hash,
            fromAddress: trx.from,
            toAddress: trx.to,
            metadata: {
                gasLimit: trx.gasLimit,
                gasPrice: trx.gasPrice,
                gasUsed: trx.gasUsed,
                inputs: trx.inputs,
                outputs: trx.outputs,
            },
        });
        console_1.logger.debug("DEPOSIT", `New chain balance: ${result.newChainBalance} ${wallet.currency}`);
        console_1.logger.debug("DEPOSIT", `New wallet balance: ${result.newBalance} ${wallet.currency}`);
        if (utxoChains.includes(trx.chain) && trx.outputs && Array.isArray(trx.outputs)) {
            console_1.logger.debug("UTXO", `Saving UTXOs for ${trx.chain} transaction ${trx.hash}`);
            const walletAddress = chainAddress.address;
            const walletOutputs = trx.outputs.filter(output => output.addresses && output.addresses.includes(walletAddress));
            console_1.logger.debug("UTXO", `Found ${walletOutputs.length} outputs for wallet address ${walletAddress}`);
            for (let i = 0; i < trx.outputs.length; i++) {
                const output = trx.outputs[i];
                if (output.addresses && output.addresses.includes(walletAddress)) {
                    try {
                        const existingUtxo = await db_1.models.ecosystemUtxo.findOne({
                            where: {
                                transactionId: trx.hash,
                                index: i,
                                walletId: wallet.id,
                            },
                        });
                        if (existingUtxo) {
                            console_1.logger.debug("UTXO", `UTXO ${trx.hash}:${i} already exists, skipping`);
                            continue;
                        }
                        const script = output.script || 'N/A';
                        await db_1.models.ecosystemUtxo.create({
                            walletId: wallet.id,
                            transactionId: trx.hash,
                            index: i,
                            amount: parseFloat(output.value),
                            script: script,
                            status: false,
                        });
                        console_1.logger.info("UTXO", `Saved UTXO: ${trx.hash}:${i} amount=${output.value} ${wallet.currency}`);
                    }
                    catch (utxoError) {
                        console_1.logger.error("UTXO", `Failed to save UTXO ${trx.hash}:${i}: ${utxoError.message}`);
                    }
                }
            }
            console_1.logger.debug("UTXO", `Completed UTXO save for transaction ${trx.hash}`);
        }
        const updatedWallet = await db_1.models.wallet.findOne({
            where: { id: wallet.id },
        });
        return {
            transactionId: result.transactionId,
            wallet: updatedWallet,
        };
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to handle ecosystem deposit", error);
        throw error;
    }
};
exports.handleEcosystemDeposit = handleEcosystemDeposit;
const satoshiToBTC = (value) => value / 1e8;
async function updatePrivateLedger(wallet_id, index, currency, chain, difference, transaction) {
    try {
        return await wallet_1.ledgerService.updateLedger({
            walletId: wallet_id,
            index,
            currency,
            chain: chain,
            amount: difference,
            transaction,
        });
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to update private ledger", error);
        throw error;
    }
}
const updateBalancePrecision = (balance, chain) => {
    const fixedPrecisionChains = {
        BTC: 8,
        LTC: 8,
        DOGE: 8,
        DASH: 8,
        SOL: 8,
        TRON: 6,
        XMR: 12,
        BSC: 8,
        ETH: 8,
        POLYGON: 8,
        ARBITRUM: 8,
        OPTIMISM: 8,
        BASE: 8,
        AVAX: 8,
        FTM: 8,
        CELO: 8,
        RSK: 8,
    };
    if (fixedPrecisionChains[chain] !== undefined) {
        return parseFloat(balance.toFixed(fixedPrecisionChains[chain]));
    }
    return balance;
};
const decrementWalletBalance = async (userWallet, chain, amount, dbTransaction, transactionId) => {
    try {
        const nonce = transactionId || (0, uuid_1.v4)();
        const idempotencyKey = `eco_debit_${userWallet.id}_${chain}_${amount}_${nonce}`;
        const result = await wallet_1.walletService.ecoDebit({
            idempotencyKey,
            userId: userWallet.userId,
            walletId: userWallet.id,
            currency: userWallet.currency,
            chain: chain,
            amount,
            operationType: "ECO_WITHDRAW",
            description: `Withdrawal of ${amount} ${userWallet.currency} on ${chain}`,
            transaction: dbTransaction,
        });
        return result;
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to decrement wallet balance", error);
        throw error;
    }
};
exports.decrementWalletBalance = decrementWalletBalance;
async function createPendingTransaction(userId, walletId, currency, chain, amount, toAddress, withdrawalFee, token, dbTransaction, feeBreakdown) {
    var _a, _b, _c;
    try {
        const createOptions = {
            userId: userId,
            walletId: walletId,
            type: "WITHDRAW",
            status: "PENDING",
            amount: amount,
            fee: withdrawalFee,
            description: `Pending withdrawal of ${amount} ${currency} to ${toAddress}`,
            metadata: JSON.stringify({
                toAddress: toAddress,
                chain: chain,
                contractType: token.contractType,
                contract: token.contract,
                decimals: token.decimals,
                withdrawalFee: withdrawalFee,
                activationFee: (_a = feeBreakdown === null || feeBreakdown === void 0 ? void 0 : feeBreakdown.activationFee) !== null && _a !== void 0 ? _a : 0,
                estimatedFee: (_b = feeBreakdown === null || feeBreakdown === void 0 ? void 0 : feeBreakdown.estimatedFee) !== null && _b !== void 0 ? _b : 0,
                totalAmount: (_c = feeBreakdown === null || feeBreakdown === void 0 ? void 0 : feeBreakdown.totalAmount) !== null && _c !== void 0 ? _c : amount + withdrawalFee,
            }),
        };
        if (dbTransaction) {
            return await db_1.models.transaction.create(createOptions, { transaction: dbTransaction });
        }
        return await db_1.models.transaction.create(createOptions);
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to create pending transaction", error);
        throw error;
    }
}
const refundUser = async (transaction) => {
    try {
        await db_1.models.transaction.update({
            status: "FAILED",
            description: `Refund of ${transaction.amount}`,
        }, {
            where: { id: transaction.id },
        });
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        const metadata = JSON.parse(transaction.metadata);
        const storedTotal = Number(metadata === null || metadata === void 0 ? void 0 : metadata.totalAmount);
        const amount = Number.isFinite(storedTotal) && storedTotal > 0
            ? storedTotal
            : transaction.amount
                + transaction.fee
                + (Number(metadata === null || metadata === void 0 ? void 0 : metadata.activationFee) || 0)
                + (Number(metadata === null || metadata === void 0 ? void 0 : metadata.estimatedFee) || 0);
        const chain = metadata === null || metadata === void 0 ? void 0 : metadata.chain;
        const idempotencyKey = `eco_refund_${transaction.id}`;
        await wallet_1.walletService.ecoRefund({
            idempotencyKey,
            userId: wallet.userId,
            walletId: wallet.id,
            currency: wallet.currency,
            chain: chain,
            amount,
            operationType: "ECO_REFUND",
            description: `Refund of ${amount} ${wallet.currency} for failed withdrawal`,
            referenceId: transaction.id,
            metadata: {
                originalTransactionId: transaction.id,
                reason: "withdrawal_failed",
            },
        });
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to refund user", error);
        throw error;
    }
};
exports.refundUser = refundUser;
const updateAlternativeWallet = async (currency, chain, amount, transaction) => {
    const run = async (t) => {
        const altBootstrap = await db_1.models.walletData.findOne({
            where: {
                currency: currency,
                chain: chain,
            },
            transaction: t,
        });
        if (!altBootstrap) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Alternative wallet not found" });
        }
        const alternativeWalletData = await db_1.models.walletData.findOne({
            where: { id: altBootstrap.id },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!alternativeWalletData) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Alternative wallet not found" });
        }
        const rawNewBalance = parseFloat(String(alternativeWalletData.balance)) - amount;
        if (rawNewBalance < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Alternative wallet balance would go negative (have=${alternativeWalletData.balance}, debit=${amount})`,
            });
        }
        const newBalance = updateBalancePrecision(rawNewBalance, chain);
        await db_1.models.walletData.update({
            balance: newBalance,
        }, {
            where: { id: alternativeWalletData.id },
            transaction: t,
        });
        await updatePrivateLedger(alternativeWalletData.walletId, alternativeWalletData.index, currency, chain, -amount, t);
    };
    try {
        if (transaction) {
            await run(transaction);
        }
        else {
            await db_1.sequelize.transaction(async (t) => {
                await run(t);
            });
        }
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to update alternative wallet", error);
        throw error;
    }
};
exports.updateAlternativeWallet = updateAlternativeWallet;
async function updateWalletBalance(wallet, balanceChange, type, idempotencyKey, transaction) {
    var _a;
    try {
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        if (!idempotencyKey)
            throw (0, error_1.createError)({ statusCode: 400, message: "idempotencyKey is required for updateWalletBalance" });
        let userId = wallet.userId;
        if (!userId) {
            const freshWallet = await db_1.models.wallet.findByPk(wallet.id, {
                attributes: ["userId"],
            });
            if (!freshWallet || !freshWallet.userId) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found or has no userId" });
            }
            userId = freshWallet.userId;
        }
        if (type === "subtract") {
            await wallet_1.walletService.hold({
                idempotencyKey,
                userId,
                walletId: wallet.id,
                walletType: wallet.type || "ECO",
                currency: wallet.currency,
                amount: balanceChange,
                reason: "Order placement",
                transaction,
            });
        }
        else {
            const heldAvailable = Number((_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0);
            const heldPortion = Math.max(0, Math.min(balanceChange, heldAvailable));
            const creditPortion = balanceChange - heldPortion;
            if (heldPortion > 0) {
                await wallet_1.walletService.release({
                    idempotencyKey: `${idempotencyKey}_release`,
                    userId,
                    walletId: wallet.id,
                    walletType: wallet.type || "ECO",
                    currency: wallet.currency,
                    amount: heldPortion,
                    reason: "Order cancelled/filled",
                    transaction,
                });
            }
            if (creditPortion > 0) {
                await wallet_1.walletService.credit({
                    idempotencyKey: `${idempotencyKey}_credit`,
                    userId,
                    walletId: wallet.id,
                    walletType: wallet.type || "ECO",
                    currency: wallet.currency,
                    amount: creditPortion,
                    operationType: "TRADE_CREDIT",
                    description: "Order payout surplus (PnL beyond held margin)",
                    transaction,
                });
            }
        }
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to update wallet balance", error);
        throw error;
    }
}
async function updateWalletForFill(wallet, balanceChange, inOrderChange, operation, idempotencyKey, transaction) {
    try {
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        if (!idempotencyKey)
            throw (0, error_1.createError)({ statusCode: 400, message: "idempotencyKey is required for updateWalletForFill" });
        let userId = wallet.userId;
        if (!userId) {
            const freshWallet = await db_1.models.wallet.findByPk(wallet.id, {
                attributes: ["userId"],
                transaction,
            });
            if (!freshWallet || !freshWallet.userId) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found or has no userId" });
            }
            userId = freshWallet.userId;
        }
        if (balanceChange > 0) {
            await wallet_1.walletService.credit({
                idempotencyKey: `${idempotencyKey}_credit`,
                userId,
                walletId: wallet.id,
                walletType: wallet.type || "ECO",
                currency: wallet.currency,
                amount: balanceChange,
                operationType: "TRADE_CREDIT",
                description: operation,
                transaction,
            });
        }
        else if (balanceChange < 0) {
            await wallet_1.walletService.debit({
                idempotencyKey: `${idempotencyKey}_debit`,
                userId,
                walletId: wallet.id,
                walletType: wallet.type || "ECO",
                currency: wallet.currency,
                amount: Math.abs(balanceChange),
                operationType: "TRADE_DEBIT",
                description: operation,
                transaction,
            });
        }
        if (inOrderChange < 0) {
            await wallet_1.walletService.executeFromHold({
                idempotencyKey: `${idempotencyKey}_execute`,
                userId,
                walletId: wallet.id,
                walletType: wallet.type || "ECO",
                currency: wallet.currency,
                amount: Math.abs(inOrderChange),
                operationType: "RELEASE",
                description: `Execute from hold: ${operation}`,
                reason: operation,
                transaction,
            });
        }
    }
    catch (error) {
        console_1.logger.error("WALLET", "Failed to update wallet for fill", error);
        throw error;
    }
}
