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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressGenerationService = exports.AddressGenerationService = void 0;
const db_1 = require("@b/db");
const ethers_1 = require("ethers");
const encrypt_1 = require("@b/utils/encrypt");
const console_1 = require("@b/utils/console");
const errors_1 = require("./errors");
const constants_1 = require("./constants");
class AddressGenerationService {
    constructor() { }
    static getInstance() {
        if (!AddressGenerationService.instance) {
            AddressGenerationService.instance = new AddressGenerationService();
        }
        return AddressGenerationService.instance;
    }
    async generateAddress(params) {
        const { chain, contractType } = params;
        console_1.logger.debug("ADDRESS_GEN", `Generating address for ${chain} (${contractType})`);
        try {
            switch (contractType) {
                case "NATIVE":
                    return await this.generateNativeAddress(params);
                case "PERMIT":
                    return await this.generatePermitAddress(params);
                case "NO_PERMIT":
                    return this.generateNoPermitAddress(params);
                default:
                    throw new errors_1.WalletError(`Unknown contract type: ${contractType}`, "INVALID_CONTRACT_TYPE", 400);
            }
        }
        catch (error) {
            console_1.logger.error("ADDRESS_GEN", `Failed to generate address for ${chain}: ${error.message}`);
            throw error;
        }
    }
    async generateNativeAddress(params) {
        const { chain } = params;
        if ((0, constants_1.isUtxoChain)(chain)) {
            return await this.generateUtxoAddress(params);
        }
        switch (chain) {
            case "SOL":
                return await this.generateSolanaAddress(params);
            case "TRON":
                return await this.generateTronAddress(params);
            case "XMR":
                return await this.generateMoneroAddress(params);
            case "TON":
                return await this.generateTonAddress(params);
            default:
                if ((0, constants_1.isEvmChain)(chain)) {
                    return await this.generateEvmNativeAddress(params);
                }
                throw new errors_1.WalletError(`Unsupported chain: ${chain}`, "UNSUPPORTED_CHAIN", 400);
        }
    }
    async generateUtxoAddress(params) {
        const { chain, network } = params;
        try {
            const bitcoin = await Promise.resolve().then(() => __importStar(require("bitcoinjs-lib")));
            const { ECPairFactory } = await Promise.resolve().then(() => __importStar(require("ecpair")));
            const ecc = await Promise.resolve().then(() => __importStar(require("tiny-secp256k1")));
            const ECPair = ECPairFactory(ecc);
            const networkConfig = this.getUtxoNetwork(chain, bitcoin);
            const keyPair = ECPair.makeRandom({ network: networkConfig });
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: networkConfig,
            });
            if (!address) {
                throw new errors_1.AddressGenerationError(chain, "Failed to generate address");
            }
            const walletData = {
                privateKey: keyPair.toWIF(),
                publicKey: Buffer.from(keyPair.publicKey).toString("hex"),
            };
            return {
                chain,
                address,
                network: network || "mainnet",
                encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(walletData)),
                index: 0,
            };
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.AddressGenerationError(chain, error.message);
        }
    }
    getUtxoNetwork(chain, bitcoin) {
        const networks = {
            BTC: bitcoin.networks.bitcoin,
            LTC: {
                messagePrefix: "\x19Litecoin Signed Message:\n",
                bech32: "ltc",
                bip32: { public: 0x019da462, private: 0x019d9cfe },
                pubKeyHash: 0x30,
                scriptHash: 0x32,
                wif: 0xb0,
            },
            DOGE: {
                messagePrefix: "\x19Dogecoin Signed Message:\n",
                bip32: { public: 0x02facafd, private: 0x02fac398 },
                pubKeyHash: 0x1e,
                scriptHash: 0x16,
                wif: 0x9e,
            },
            DASH: {
                messagePrefix: "\x19DarkCoin Signed Message:\n",
                bip32: { public: 0x02fe52cc, private: 0x02fe52f8 },
                pubKeyHash: 0x4c,
                scriptHash: 0x10,
                wif: 0xcc,
            },
        };
        return networks[chain] || bitcoin.networks.bitcoin;
    }
    async generateSolanaAddress(params) {
        try {
            const { getSolanaService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const SolanaService = await getSolanaService();
            if (!SolanaService) {
                throw new errors_1.WalletError("Solana service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const solanaService = await SolanaService.getInstance();
            const { address, data } = solanaService.createWallet();
            return {
                chain: "SOL",
                address,
                network: process.env.SOLANA_NETWORK || "mainnet",
                encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(data)),
                index: 0,
            };
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.AddressGenerationError("SOL", error.message);
        }
    }
    async generateTronAddress(params) {
        try {
            const { getTronService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const TronService = await getTronService();
            if (!TronService) {
                throw new errors_1.WalletError("Tron service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const tronService = await TronService.getInstance();
            const { address, data } = tronService.createWallet();
            return {
                chain: "TRON",
                address,
                network: process.env.TRON_NETWORK || "mainnet",
                encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(data)),
                index: 0,
            };
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.AddressGenerationError("TRON", error.message);
        }
    }
    async generateMoneroAddress(params) {
        try {
            const { getMoneroService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const MoneroService = await getMoneroService();
            if (!MoneroService) {
                throw new errors_1.WalletError("Monero service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const moneroService = await MoneroService.getInstance();
            const { address, data } = await moneroService.createWallet(params.walletId);
            return {
                chain: "XMR",
                address,
                network: process.env.MONERO_NETWORK || "mainnet",
                encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(data)),
                index: 0,
            };
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.AddressGenerationError("XMR", error.message);
        }
    }
    async generateTonAddress(params) {
        try {
            const { getTonService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const TonService = await getTonService();
            if (!TonService) {
                throw new errors_1.WalletError("TON service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const tonService = await TonService.getInstance();
            const { address, data } = await tonService.createWallet();
            return {
                chain: "TON",
                address,
                network: process.env.TON_NETWORK || "mainnet",
                encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(data)),
                index: 0,
            };
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.AddressGenerationError("TON", error.message);
        }
    }
    async generateEvmNativeAddress(params) {
        const { chain, network } = params;
        try {
            const wallet = ethers_1.ethers.Wallet.createRandom();
            if (!wallet.mnemonic) {
                throw new errors_1.AddressGenerationError(chain, "Failed to generate mnemonic");
            }
            const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(wallet.mnemonic.phrase);
            const walletData = {
                mnemonic: hdNode.mnemonic.phrase,
                publicKey: hdNode.publicKey,
                privateKey: hdNode.privateKey,
                xprv: hdNode.extendedKey,
                xpub: hdNode.neuter().extendedKey,
                chainCode: hdNode.chainCode,
                path: hdNode.path,
            };
            return {
                chain,
                address: hdNode.address,
                network: network || "mainnet",
                encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(walletData)),
                index: 0,
            };
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.AddressGenerationError(chain, error.message);
        }
    }
    async generatePermitAddress(params) {
        const { chain, network, transaction } = params;
        if (chain === "SOL") {
            return await this.generateSolanaAddress(params);
        }
        try {
            if (!db_1.models.ecosystemMasterWallet) {
                throw new errors_1.WalletError("EcosystemMasterWallet model not available", "MODEL_NOT_AVAILABLE", 500);
            }
            const masterWallet = await db_1.models.ecosystemMasterWallet.findOne({
                where: { chain, status: true },
                ...(transaction && { transaction }),
            });
            if (!masterWallet || !masterWallet.data) {
                throw new errors_1.MasterWalletNotFoundError(chain);
            }
            const nextIndex = (masterWallet.lastIndex || 0) + 1;
            await db_1.models.ecosystemMasterWallet.update({ lastIndex: nextIndex }, {
                where: { id: masterWallet.id },
                ...(transaction && { transaction }),
            });
            const decryptedMasterData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
            const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(decryptedMasterData.mnemonic);
            const childNode = hdNode.deriveChild(nextIndex);
            if (!childNode.address) {
                throw new errors_1.AddressGenerationError(chain, "Failed to derive child address");
            }
            const childData = {
                address: childNode.address,
                publicKey: childNode.publicKey,
                privateKey: childNode.privateKey,
            };
            return {
                chain,
                address: childNode.address,
                network: network || "mainnet",
                encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(childData)),
                index: nextIndex,
            };
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.AddressGenerationError(chain, error.message);
        }
    }
    generateNoPermitAddress(params) {
        return {
            chain: params.chain,
            address: "",
            network: params.network || "mainnet",
            encryptedData: "",
            index: 0,
        };
    }
    async deriveAddressFromMaster(chain, index, transaction) {
        if (!db_1.models.ecosystemMasterWallet) {
            throw new errors_1.WalletError("EcosystemMasterWallet model not available", "MODEL_NOT_AVAILABLE", 500);
        }
        const masterWallet = await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain, status: true },
            ...(transaction && { transaction }),
        });
        if (!masterWallet || !masterWallet.data) {
            throw new errors_1.MasterWalletNotFoundError(chain);
        }
        const decryptedMasterData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
        const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(decryptedMasterData.mnemonic);
        const childNode = hdNode.deriveChild(index);
        const childData = {
            address: childNode.address,
            publicKey: childNode.publicKey,
            privateKey: childNode.privateKey,
        };
        const network = process.env[`${chain.toUpperCase()}_NETWORK`] || "mainnet";
        return {
            chain,
            address: childNode.address,
            network: network,
            encryptedData: (0, encrypt_1.encrypt)(JSON.stringify(childData)),
            index,
        };
    }
    validateAddress(chain, address) {
        try {
            if ((0, constants_1.isEvmChain)(chain)) {
                return ethers_1.ethers.isAddress(address);
            }
            switch (chain) {
                case "BTC":
                    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-zAC-HJ-NP-Z02-9]{11,71}$/.test(address);
                case "LTC":
                    return /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-zA-HJ-NP-Z0-9]{25,}$/.test(address);
                case "DOGE":
                    return /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/.test(address);
                case "DASH":
                    return /^X[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
                case "SOL":
                    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
                case "TRON":
                    return /^T[A-Za-z1-9]{33}$/.test(address);
                case "XMR":
                    return /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(address);
                case "TON":
                    return /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/.test(address);
                default:
                    return false;
            }
        }
        catch (_a) {
            return false;
        }
    }
}
exports.AddressGenerationService = AddressGenerationService;
exports.addressGenerationService = AddressGenerationService.getInstance();
