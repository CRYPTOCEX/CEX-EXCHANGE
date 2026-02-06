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
exports.masterWalletService = exports.MasterWalletService = void 0;
const db_1 = require("@b/db");
const ethers_1 = require("ethers");
const encrypt_1 = require("@b/utils/encrypt");
const console_1 = require("@b/utils/console");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("./errors");
const constants_1 = require("./constants");
class MasterWalletService {
    constructor() {
        this.walletDir = path.join(process.cwd(), "ecosystem", "wallets");
        this.ensureWalletDirectory();
    }
    static getInstance() {
        if (!MasterWalletService.instance) {
            MasterWalletService.instance = new MasterWalletService();
        }
        return MasterWalletService.instance;
    }
    ensureWalletDirectory() {
        try {
            if (!fs.existsSync(this.walletDir)) {
                fs.mkdirSync(this.walletDir, { recursive: true });
                console_1.logger.debug("MASTER_WALLET", `Created wallet directory: ${this.walletDir}`);
            }
        }
        catch (error) {
            console_1.logger.warn("MASTER_WALLET", `Failed to create wallet directory: ${error.message}`);
        }
    }
    async getMasterWallet(chain) {
        if (!db_1.models.ecosystemMasterWallet) {
            console_1.logger.warn("MASTER_WALLET", "EcosystemMasterWallet model not available");
            return null;
        }
        const wallet = await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain, status: true },
        });
        return wallet ? this.toAttributes(wallet) : null;
    }
    async getMasterWalletById(id) {
        if (!db_1.models.ecosystemMasterWallet) {
            return null;
        }
        const wallet = await db_1.models.ecosystemMasterWallet.findByPk(id);
        return wallet ? this.toAttributes(wallet) : null;
    }
    async getAllMasterWallets() {
        if (!db_1.models.ecosystemMasterWallet) {
            return [];
        }
        const wallets = await db_1.models.ecosystemMasterWallet.findAll();
        return wallets.map((w) => this.toAttributes(w));
    }
    async getMasterWalletOrThrow(chain) {
        const wallet = await this.getMasterWallet(chain);
        if (!wallet) {
            throw new errors_1.MasterWalletNotFoundError(chain);
        }
        return wallet;
    }
    async createMasterWallet(request) {
        const { chain, currency } = request;
        if (!db_1.models.ecosystemMasterWallet) {
            throw new errors_1.WalletError("EcosystemMasterWallet model not available", "MODEL_NOT_AVAILABLE", 500);
        }
        const existing = await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain },
        });
        if (existing) {
            throw new errors_1.MasterWalletExistsError(chain);
        }
        let walletData;
        if ((0, constants_1.isUtxoChain)(chain)) {
            walletData = await this.createUtxoMasterWallet(chain);
        }
        else {
            switch (chain) {
                case "SOL":
                    walletData = await this.createSolanaMasterWallet();
                    break;
                case "TRON":
                    walletData = await this.createTronMasterWallet();
                    break;
                case "XMR":
                    walletData = await this.createMoneroMasterWallet();
                    break;
                case "TON":
                    walletData = await this.createTonMasterWallet();
                    break;
                default:
                    walletData = await this.createEvmMasterWallet();
            }
        }
        try {
            const walletFilePath = path.join(this.walletDir, `${chain}.json`);
            fs.writeFileSync(walletFilePath, JSON.stringify(walletData), "utf8");
            console_1.logger.info("MASTER_WALLET", `Saved master wallet backup to ${walletFilePath}`);
        }
        catch (error) {
            console_1.logger.warn("MASTER_WALLET", `Failed to save wallet backup: ${error.message}`);
        }
        const encryptedData = (0, encrypt_1.encrypt)(JSON.stringify(walletData.data));
        const masterWallet = await db_1.models.ecosystemMasterWallet.create({
            chain,
            currency: currency || chain,
            address: walletData.address,
            balance: 0,
            data: encryptedData,
            status: true,
            lastIndex: 0,
        });
        console_1.logger.success("MASTER_WALLET", `Created master wallet for ${chain}: ${walletData.address}`);
        return this.toAttributes(masterWallet);
    }
    async createEvmMasterWallet() {
        const wallet = ethers_1.ethers.Wallet.createRandom();
        if (!wallet.mnemonic) {
            throw new errors_1.WalletError("Failed to generate mnemonic", "MNEMONIC_FAILED", 500);
        }
        const hdNode = ethers_1.ethers.HDNodeWallet.fromPhrase(wallet.mnemonic.phrase);
        return {
            address: hdNode.address,
            data: {
                mnemonic: hdNode.mnemonic.phrase,
                publicKey: hdNode.publicKey,
                privateKey: hdNode.privateKey,
                xprv: hdNode.extendedKey,
                xpub: hdNode.neuter().extendedKey,
                chainCode: hdNode.chainCode,
                path: hdNode.path,
            },
        };
    }
    async createUtxoMasterWallet(chain) {
        try {
            const bitcoin = await Promise.resolve().then(() => __importStar(require("bitcoinjs-lib")));
            const { ECPairFactory } = await Promise.resolve().then(() => __importStar(require("ecpair")));
            const ecc = await Promise.resolve().then(() => __importStar(require("tiny-secp256k1")));
            const ECPair = ECPairFactory(ecc);
            const network = this.getUtxoNetwork(chain, bitcoin);
            const keyPair = ECPair.makeRandom({ network });
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network,
            });
            if (!address) {
                throw new errors_1.WalletError(`Failed to generate ${chain} address`, "ADDRESS_FAILED", 500);
            }
            return {
                address,
                data: {
                    privateKey: keyPair.toWIF(),
                    publicKey: Buffer.from(keyPair.publicKey).toString("hex"),
                },
            };
        }
        catch (error) {
            throw new errors_1.WalletError(`Failed to create UTXO master wallet: ${error.message}`, "UTXO_CREATION_FAILED", 500);
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
    async createSolanaMasterWallet() {
        try {
            const { getSolanaService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const SolanaService = await getSolanaService();
            if (!SolanaService) {
                throw new errors_1.WalletError("Solana service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const service = await SolanaService.getInstance();
            return service.createWallet();
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.WalletError(`Failed to create Solana master wallet: ${error.message}`, "SOLANA_CREATION_FAILED", 500);
        }
    }
    async createTronMasterWallet() {
        try {
            const { getTronService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const TronService = await getTronService();
            if (!TronService) {
                throw new errors_1.WalletError("Tron service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const service = await TronService.getInstance();
            return service.createWallet();
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.WalletError(`Failed to create Tron master wallet: ${error.message}`, "TRON_CREATION_FAILED", 500);
        }
    }
    async createMoneroMasterWallet() {
        try {
            const { getMoneroService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const MoneroService = await getMoneroService();
            if (!MoneroService) {
                throw new errors_1.WalletError("Monero service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const service = await MoneroService.getInstance();
            return service.createWallet("master_wallet");
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.WalletError(`Failed to create Monero master wallet: ${error.message}`, "MONERO_CREATION_FAILED", 500);
        }
    }
    async createTonMasterWallet() {
        try {
            const { getTonService } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const TonService = await getTonService();
            if (!TonService) {
                throw new errors_1.WalletError("TON service not available", "SERVICE_UNAVAILABLE", 503);
            }
            const service = await TonService.getInstance();
            return service.createWallet();
        }
        catch (error) {
            if (error instanceof errors_1.WalletError)
                throw error;
            throw new errors_1.WalletError(`Failed to create TON master wallet: ${error.message}`, "TON_CREATION_FAILED", 500);
        }
    }
    async updateBalance(chain, newBalance, transaction) {
        if (!db_1.models.ecosystemMasterWallet) {
            return;
        }
        await db_1.models.ecosystemMasterWallet.update({ balance: newBalance }, {
            where: { chain },
            ...(transaction && { transaction }),
        });
        console_1.logger.debug("MASTER_WALLET", `Updated balance for ${chain}: ${newBalance}`);
    }
    async incrementBalance(chain, amount, transaction) {
        const wallet = await this.getMasterWallet(chain);
        if (!wallet) {
            throw new errors_1.MasterWalletNotFoundError(chain);
        }
        const newBalance = wallet.balance + amount;
        await this.updateBalance(chain, newBalance, transaction);
    }
    async decrementBalance(chain, amount, transaction) {
        const wallet = await this.getMasterWallet(chain);
        if (!wallet) {
            throw new errors_1.MasterWalletNotFoundError(chain);
        }
        const newBalance = wallet.balance - amount;
        if (newBalance < 0) {
            throw new errors_1.WalletError(`Insufficient master wallet balance: ${wallet.balance} < ${amount}`, "INSUFFICIENT_MASTER_BALANCE", 400);
        }
        await this.updateBalance(chain, newBalance, transaction);
    }
    async getNextIndex(chain, transaction) {
        if (!db_1.models.ecosystemMasterWallet) {
            throw new errors_1.WalletError("EcosystemMasterWallet model not available", "MODEL_NOT_AVAILABLE", 500);
        }
        const wallet = await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain, status: true },
            ...(transaction && { transaction }),
        });
        if (!wallet) {
            throw new errors_1.MasterWalletNotFoundError(chain);
        }
        const nextIndex = (wallet.lastIndex || 0) + 1;
        await db_1.models.ecosystemMasterWallet.update({ lastIndex: nextIndex }, {
            where: { id: wallet.id },
            ...(transaction && { transaction }),
        });
        return nextIndex;
    }
    async getDecryptedData(chain) {
        const wallet = await this.getMasterWallet(chain);
        if (!wallet || !wallet.data) {
            throw new errors_1.MasterWalletNotFoundError(chain);
        }
        try {
            return JSON.parse((0, encrypt_1.decrypt)(wallet.data));
        }
        catch (error) {
            throw new errors_1.WalletError(`Failed to decrypt master wallet data: ${error.message}`, "DECRYPTION_FAILED", 500);
        }
    }
    async setStatus(chain, status) {
        if (!db_1.models.ecosystemMasterWallet) {
            return;
        }
        await db_1.models.ecosystemMasterWallet.update({ status }, { where: { chain } });
        console_1.logger.info("MASTER_WALLET", `Set status for ${chain} to ${status}`);
    }
    async activate(chain) {
        await this.setStatus(chain, true);
    }
    async deactivate(chain) {
        await this.setStatus(chain, false);
    }
    toAttributes(wallet) {
        var _a, _b;
        const plain = wallet.get ? wallet.get({ plain: true }) : wallet;
        return {
            ...plain,
            balance: parseFloat(((_a = plain.balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"),
            lastIndex: parseInt(((_b = plain.lastIndex) === null || _b === void 0 ? void 0 : _b.toString()) || "0", 10),
        };
    }
    async exists(chain) {
        const wallet = await this.getMasterWallet(chain);
        return wallet !== null;
    }
    async getAddress(chain) {
        const wallet = await this.getMasterWallet(chain);
        return (wallet === null || wallet === void 0 ? void 0 : wallet.address) || null;
    }
}
exports.MasterWalletService = MasterWalletService;
exports.masterWalletService = MasterWalletService.getInstance();
