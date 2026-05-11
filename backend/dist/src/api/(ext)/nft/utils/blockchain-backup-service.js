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
exports.BlockchainBackupService = void 0;
exports.getBlockchainBackupService = getBlockchainBackupService;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const console_1 = require("@b/utils/console");
let getProvider;
try {
    const providerModule = require("../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
}
catch (e) {
}
class BlockchainBackupService {
    constructor(chain) {
        this.s3Client = null;
        this.chain = chain;
        this.backupPath = process.env.BACKUP_PATH || path.join(process.cwd(), "backups", "nft");
        this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || "";
        this.bucketName = process.env.AWS_BACKUP_BUCKET || "nft-marketplace-backups";
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            this.s3Client = null;
        }
        this.ensureBackupDirectory();
    }
    async createBackup(includeDisputes = true) {
        var _a;
        try {
            console_1.logger.info("NFT_BACKUP", `Starting blockchain state backup for ${this.chain}...`);
            const provider = await getProvider(this.chain);
            const blockNumber = await provider.getBlockNumber();
            const backupData = await this.collectBackupData(includeDisputes);
            backupData.metadata = {
                version: "2.0.0",
                timestamp: new Date(),
                chain: this.chain,
                blockNumber,
                checksum: "",
                encrypted: !!this.encryptionKey,
                compressed: true,
                dataTypes: Object.keys(backupData).filter(k => k !== "metadata"),
                recordCount: {
                    contracts: backupData.contracts.length,
                    listings: backupData.listings.length,
                    tokens: backupData.tokens.length,
                    transactions: backupData.transactions.length,
                    disputes: ((_a = backupData.disputes) === null || _a === void 0 ? void 0 : _a.length) || 0,
                },
            };
            let backupJson = JSON.stringify(backupData, null, 2);
            backupData.metadata.checksum = this.calculateChecksum(backupJson);
            backupJson = JSON.stringify(backupData, null, 2);
            if (this.encryptionKey) {
                backupJson = this.encrypt(backupJson);
            }
            const zlib = require("zlib");
            const compressed = zlib.gzipSync(backupJson);
            const filename = this.generateBackupFilename(blockNumber);
            const localPath = await this.saveLocalBackup(filename, compressed);
            console_1.logger.success("NFT_BACKUP", `Local backup saved: ${localPath}`);
            if (this.s3Client) {
                await this.uploadToS3(filename, compressed, backupData.metadata);
                console_1.logger.success("NFT_BACKUP", `S3 backup uploaded: s3://${this.bucketName}/${filename}`);
            }
            await this.saveBackupRecord(filename, backupData.metadata, localPath);
            await this.cleanOldBackups();
            console_1.logger.success("NFT_BACKUP", `Backup completed successfully: ${filename}`);
            return filename;
        }
        catch (error) {
            console_1.logger.error("NFT_BACKUP", "Backup creation error", error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Backup failed: ${error.message}`,
            });
        }
    }
    async restoreFromBackup(filename, validateOnly = false) {
        try {
            console_1.logger.info("NFT_BACKUP", `Starting restoration from ${filename}...`);
            const backupData = await this.loadBackup(filename);
            const validation = await this.validateBackup(backupData);
            if (!validation.valid) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Backup validation failed: ${validation.errors.join(", ")}` });
            }
            if (validateOnly) {
                return {
                    success: true,
                    metadata: backupData.metadata,
                    recovered: { contracts: 0, listings: 0, tokens: 0, transactions: 0, disputes: 0 },
                    errors: [],
                    warnings: ["Validation only mode - no data was restored"],
                };
            }
            const result = await this.performRestore(backupData);
            console_1.logger.success("NFT_BACKUP", `Restoration completed: ${JSON.stringify(result.recovered)}`);
            return result;
        }
        catch (error) {
            console_1.logger.error("NFT_BACKUP", "Restore error", error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Restore failed: ${error.message}`,
            });
        }
    }
    async createIncrementalBackup() {
        try {
            const lastBackup = await this.getLastBackupMetadata();
            if (!lastBackup) {
                console_1.logger.info("NFT_BACKUP", "No previous backup found, creating full backup...");
                return this.createBackup();
            }
            const lastTimestamp = new Date(lastBackup.timestamp);
            console_1.logger.info("NFT_BACKUP", `Creating incremental backup since ${lastTimestamp.toISOString()}...`);
            const incrementalData = await this.collectIncrementalData(lastTimestamp);
            const filename = this.generateBackupFilename(undefined, "incremental");
            const compressed = this.prepareBackupData(incrementalData);
            await this.saveLocalBackup(filename, compressed);
            if (this.s3Client) {
                await this.uploadToS3(filename, compressed, incrementalData.metadata);
            }
            console_1.logger.success("NFT_BACKUP", `Incremental backup completed: ${filename}`);
            return filename;
        }
        catch (error) {
            console_1.logger.error("NFT_BACKUP", "Incremental backup error", error);
            throw error;
        }
    }
    async verifyStateConsistency() {
        try {
            console_1.logger.info("NFT_BACKUP", "Starting blockchain state verification...");
            const discrepancies = [];
            const recommendations = [];
            const contracts = await db_1.models.nftCollection.findAll({
                where: { contractAddress: { $ne: null } },
            });
            const provider = await getProvider(this.chain);
            for (const contract of contracts) {
                if (contract.contractAddress) {
                    const code = await provider.getCode(contract.contractAddress);
                    if (code === "0x") {
                        discrepancies.push(`Contract ${contract.id} address ${contract.contractAddress} has no code on chain`);
                        recommendations.push(`Re-deploy contract for collection ${contract.name}`);
                    }
                }
            }
            const mintedTokens = await db_1.models.nftToken.findAll({
                where: { isMinted: true },
                limit: 100,
            });
            for (const token of mintedTokens) {
                if (token.transactionHash) {
                    try {
                        const tx = await provider.getTransaction(token.transactionHash);
                        if (!tx) {
                            discrepancies.push(`Token ${token.id} transaction ${token.transactionHash} not found on chain`);
                            recommendations.push(`Verify and possibly re-mint token ${token.name}`);
                        }
                    }
                    catch (error) {
                        discrepancies.push(`Error checking token ${token.id}: ${error.message}`);
                    }
                }
            }
            const activeListings = await db_1.models.nftListing.findAll({
                where: { status: "ACTIVE" },
            });
            for (const listing of activeListings) {
                const token = await db_1.models.nftToken.findByPk(listing.tokenId);
                if (token && token.ownerId !== listing.sellerId) {
                    discrepancies.push(`Listing ${listing.id} seller doesn't match token owner`);
                    recommendations.push(`Cancel listing ${listing.id} - ownership mismatch`);
                }
            }
            const consistent = discrepancies.length === 0;
            console_1.logger.info("NFT_BACKUP", `Verification complete. Consistent: ${consistent}`);
            console_1.logger.info("NFT_BACKUP", `Found ${discrepancies.length} discrepancies`);
            return {
                consistent,
                discrepancies,
                recommendations,
            };
        }
        catch (error) {
            console_1.logger.error("NFT_BACKUP", "Consistency verification error", error);
            throw error;
        }
    }
    async scheduleAutomaticBackups(intervalHours = 6) {
        console_1.logger.info("NFT_BACKUP", `Scheduling automatic backups every ${intervalHours} hours`);
        await this.createBackup();
        setInterval(async () => {
            try {
                console_1.logger.info("NFT_BACKUP", "Running scheduled backup...");
                await this.createIncrementalBackup();
            }
            catch (error) {
                console_1.logger.error("NFT_BACKUP", "Scheduled backup error", error);
            }
        }, intervalHours * 60 * 60 * 1000);
    }
    async getBackupHistory(limit = 20) {
        var _a;
        try {
            const backups = await ((_a = db_1.models.systemBackup) === null || _a === void 0 ? void 0 : _a.findAll({
                where: { type: "NFT_BLOCKCHAIN_STATE" },
                order: [["createdAt", "DESC"]],
                limit,
            }));
            if (backups && backups.length > 0) {
                return backups;
            }
            if (this.s3Client) {
                return this.listS3Backups(limit);
            }
            else {
                return this.listLocalBackups(limit);
            }
        }
        catch (error) {
            console_1.logger.error("NFT_BACKUP", "Get backup history error", error);
            return [];
        }
    }
    async collectBackupData(includeDisputes) {
        const data = {
            metadata: {},
            contracts: [],
            listings: [],
            tokens: [],
            transactions: [],
            disputes: [],
            marketplaceState: {},
            gasHistory: [],
            userBalances: [],
        };
        data.contracts = await db_1.models.nftCollection.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            raw: true,
        });
        data.tokens = await db_1.models.nftToken.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            raw: true,
        });
        data.listings = await db_1.models.nftListing.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            raw: true,
        });
        data.transactions = [];
        if (includeDisputes && db_1.models.nftDispute) {
            data.disputes = await db_1.models.nftDispute.findAll({
                attributes: { exclude: ["createdAt", "updatedAt"] },
                raw: true,
            });
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const allSettings = await cacheManager.getSettings();
        const marketplaceSettings = Array.from(allSettings.entries())
            .filter(([key]) => key.startsWith("nft"))
            .map(([key, value]) => ({ key, value }));
        data.marketplaceState = {
            settings: marketplaceSettings,
            totalVolume: await this.calculateTotalVolume(),
            activeListings: await db_1.models.nftListing.count({ where: { status: "ACTIVE" } }),
            totalTokens: await db_1.models.nftToken.count(),
        };
        if (db_1.models.gasHistory) {
            data.gasHistory = await db_1.models.gasHistory.findAll({
                where: {
                    chain: this.chain,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
                raw: true,
            });
        }
        return data;
    }
    async collectIncrementalData(since) {
        const data = {
            metadata: {},
            contracts: [],
            listings: [],
            tokens: [],
            transactions: [],
            disputes: [],
            marketplaceState: {},
            gasHistory: [],
            userBalances: [],
        };
        data.contracts = await db_1.models.nftCollection.findAll({
            where: { updatedAt: { $gte: since } },
            raw: true,
        });
        data.tokens = await db_1.models.nftToken.findAll({
            where: { updatedAt: { $gte: since } },
            raw: true,
        });
        data.listings = await db_1.models.nftListing.findAll({
            where: { updatedAt: { $gte: since } },
            raw: true,
        });
        data.transactions = [];
        return data;
    }
    async performRestore(backupData) {
        const result = {
            success: false,
            metadata: backupData.metadata,
            recovered: { contracts: 0, listings: 0, tokens: 0, transactions: 0, disputes: 0 },
            errors: [],
            warnings: [],
        };
        const transaction = await db_1.sequelize.transaction();
        try {
            for (const contract of backupData.contracts) {
                try {
                    await db_1.models.nftCollection.upsert(contract, { transaction });
                    result.recovered.contracts++;
                }
                catch (error) {
                    result.errors.push(`Failed to restore contract ${contract.id}: ${error.message}`);
                }
            }
            for (const token of backupData.tokens) {
                try {
                    await db_1.models.nftToken.upsert(token, { transaction });
                    result.recovered.tokens++;
                }
                catch (error) {
                    result.errors.push(`Failed to restore token ${token.id}: ${error.message}`);
                }
            }
            for (const listing of backupData.listings) {
                try {
                    await db_1.models.nftListing.upsert(listing, { transaction });
                    result.recovered.listings++;
                }
                catch (error) {
                    result.errors.push(`Failed to restore listing ${listing.id}: ${error.message}`);
                }
            }
            if (backupData.disputes && db_1.models.nftDispute) {
                for (const dispute of backupData.disputes) {
                    try {
                        await db_1.models.nftDispute.upsert(dispute, { transaction });
                        result.recovered.disputes++;
                    }
                    catch (error) {
                        result.warnings.push(`Failed to restore dispute ${dispute.id}: ${error.message}`);
                    }
                }
            }
            await transaction.commit();
            result.success = true;
        }
        catch (error) {
            await transaction.rollback();
            result.errors.push(`Transaction failed: ${error.message}`);
        }
        return result;
    }
    async validateBackup(backupData) {
        const errors = [];
        if (!backupData.metadata || !backupData.metadata.version) {
            errors.push("Missing or invalid metadata");
        }
        if (!backupData.contracts || !Array.isArray(backupData.contracts)) {
            errors.push("Missing or invalid contracts data");
        }
        if (!backupData.tokens || !Array.isArray(backupData.tokens)) {
            errors.push("Missing or invalid tokens data");
        }
        if (backupData.metadata.checksum) {
            const dataWithoutChecksum = { ...backupData };
            dataWithoutChecksum.metadata = { ...backupData.metadata, checksum: "" };
            const calculatedChecksum = this.calculateChecksum(JSON.stringify(dataWithoutChecksum));
            if (calculatedChecksum !== backupData.metadata.checksum) {
                errors.push("Checksum validation failed - backup may be corrupted");
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    async loadBackup(filename) {
        let data;
        if (this.s3Client) {
            try {
                data = await this.downloadFromS3(filename);
            }
            catch (error) {
                console_1.logger.warn("NFT_BACKUP", `S3 download failed, trying local: ${error.message}`);
            }
        }
        if (!data) {
            const localPath = path.join(this.backupPath, filename);
            if (!fs.existsSync(localPath)) {
                throw (0, error_1.createError)({ statusCode: 404, message: `Backup file not found: ${filename}` });
            }
            data = fs.readFileSync(localPath);
        }
        const zlib = require("zlib");
        const decompressed = zlib.gunzipSync(data);
        let jsonString = decompressed.toString();
        if (this.encryptionKey && this.isEncrypted(jsonString)) {
            jsonString = this.decrypt(jsonString);
        }
        return JSON.parse(jsonString);
    }
    prepareBackupData(data) {
        let jsonString = JSON.stringify(data, null, 2);
        if (this.encryptionKey) {
            jsonString = this.encrypt(jsonString);
        }
        const zlib = require("zlib");
        return zlib.gzipSync(jsonString);
    }
    encrypt(data) {
        const algorithm = "aes-256-gcm";
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(this.encryptionKey, "hex"), iv);
        let encrypted = cipher.update(data, "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag();
        return JSON.stringify({
            encrypted,
            authTag: authTag.toString("hex"),
            iv: iv.toString("hex"),
        });
    }
    decrypt(encryptedData) {
        const { encrypted, authTag, iv } = JSON.parse(encryptedData);
        const algorithm = "aes-256-gcm";
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(this.encryptionKey, "hex"), Buffer.from(iv, "hex"));
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    isEncrypted(data) {
        try {
            const parsed = JSON.parse(data);
            return parsed.encrypted && parsed.authTag && parsed.iv;
        }
        catch (_a) {
            return false;
        }
    }
    calculateChecksum(data) {
        return crypto.createHash("sha256").update(data).digest("hex");
    }
    generateBackupFilename(blockNumber, type = "full") {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const block = blockNumber ? `block-${blockNumber}` : "latest";
        return `nft-backup-${this.chain}-${type}-${block}-${timestamp}.gz`;
    }
    async saveLocalBackup(filename, data) {
        const filepath = path.join(this.backupPath, filename);
        fs.writeFileSync(filepath, data);
        return filepath;
    }
    async uploadToS3(filename, data, metadata) {
        if (!this.s3Client)
            return;
        const command = {
            Bucket: this.bucketName,
            Key: `nft/${this.chain}/${filename}`,
            Body: data,
            ContentType: "application/gzip",
            Metadata: {
                chain: this.chain,
                blockNumber: metadata.blockNumber.toString(),
                timestamp: metadata.timestamp.toISOString(),
                version: metadata.version,
            },
        };
    }
    async downloadFromS3(filename) {
        if (!this.s3Client)
            throw (0, error_1.createError)({ statusCode: 503, message: "S3 client not configured" });
        const command = {
            Bucket: this.bucketName,
            Key: `nft/${this.chain}/${filename}`,
        };
        throw (0, error_1.createError)({ statusCode: 503, message: "AWS SDK not available" });
    }
    async listS3Backups(limit) {
        if (!this.s3Client)
            return [];
        const command = {
            Bucket: this.bucketName,
            Prefix: `nft/${this.chain}/`,
            MaxKeys: limit,
        };
        return [];
    }
    listLocalBackups(limit) {
        const files = fs.readdirSync(this.backupPath)
            .filter(f => f.startsWith(`nft-backup-${this.chain}`))
            .sort((a, b) => b.localeCompare(a))
            .slice(0, limit)
            .map(filename => {
            const filepath = path.join(this.backupPath, filename);
            const stats = fs.statSync(filepath);
            return {
                filename,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
            };
        });
        return Promise.resolve(files);
    }
    async getLastBackupMetadata() {
        const backups = await this.getBackupHistory(1);
        if (backups.length === 0)
            return null;
        const lastBackup = backups[0];
        if (lastBackup.metadata) {
            return lastBackup.metadata;
        }
        try {
            const data = await this.loadBackup(lastBackup.filename || lastBackup.Key);
            return data.metadata;
        }
        catch (_a) {
            return null;
        }
    }
    async saveBackupRecord(filename, metadata, localPath) {
        if (!db_1.models.systemBackup)
            return;
        try {
            await db_1.models.systemBackup.create({
                type: "NFT_BLOCKCHAIN_STATE",
                filename,
                path: localPath,
                size: fs.statSync(localPath).size,
                metadata: JSON.stringify(metadata),
                status: "COMPLETED",
                chain: this.chain,
            });
        }
        catch (error) {
            console_1.logger.error("NFT_BACKUP", "Save backup record error", error);
        }
    }
    async cleanOldBackups(keepCount = 30) {
        try {
            const files = fs.readdirSync(this.backupPath)
                .filter(f => f.startsWith(`nft-backup-${this.chain}`))
                .sort((a, b) => b.localeCompare(a));
            if (files.length > keepCount) {
                const toDelete = files.slice(keepCount);
                for (const file of toDelete) {
                    fs.unlinkSync(path.join(this.backupPath, file));
                    console_1.logger.debug("NFT_BACKUP", `Deleted old backup: ${file}`);
                }
            }
            if (this.s3Client) {
            }
        }
        catch (error) {
            console_1.logger.error("NFT_BACKUP", "Clean old backups error", error);
        }
    }
    async calculateTotalVolume() {
        const result = await db_1.models.nftSale.sum("price");
        return result || 0;
    }
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
    }
}
exports.BlockchainBackupService = BlockchainBackupService;
async function getBlockchainBackupService(chain) {
    return new BlockchainBackupService(chain);
}
