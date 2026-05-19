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
exports.MetadataBackupService = void 0;
exports.getMetadataBackupService = getMetadataBackupService;
exports.startBackupSchedule = startBackupSchedule;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const ipfs_service_1 = require("./ipfs-service");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const gzip = (0, util_1.promisify)(zlib.gzip);
const gunzip = (0, util_1.promisify)(zlib.gunzip);
class MetadataBackupService {
    constructor() {
        this.config = {
            s3Enabled: !!process.env.AWS_ACCESS_KEY_ID,
            ipfsEnabled: !!process.env.IPFS_HOST || !!process.env.PINATA_API_KEY,
            localEnabled: true,
            encryptionEnabled: !!process.env.BACKUP_ENCRYPTION_KEY,
            compressionEnabled: true,
            retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "30"),
            backupInterval: parseInt(process.env.BACKUP_INTERVAL_HOURS || "6") * 3600000
        };
        this.backupPath = process.env.BACKUP_PATH || path.join(process.cwd(), "backups", "nft-metadata");
        this.initialize();
    }
    async initialize() {
        try {
            await fs.mkdir(this.backupPath, { recursive: true });
            if (this.config.s3Enabled) {
                this.s3Client = null;
            }
            if (this.config.ipfsEnabled) {
                this.ipfsService = (0, ipfs_service_1.getIPFSService)();
            }
            if (this.config.encryptionEnabled) {
                const key = process.env.BACKUP_ENCRYPTION_KEY;
                this.encryptionKey = crypto.createHash('sha256').update(key).digest();
            }
            console_1.logger.success("BACKUP", "Metadata backup service initialized");
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to initialize metadata backup service", error);
        }
    }
    async createFullBackup() {
        try {
            console_1.logger.info("BACKUP", "Starting full metadata backup...");
            const backupId = crypto.randomUUID();
            const timestamp = new Date();
            const [collections, tokens, listings] = await Promise.all([
                db_1.models.nftCollection.findAll(),
                db_1.models.nftToken.findAll(),
                db_1.models.nftListing.findAll({ where: { status: "ACTIVE" } })
            ]);
            const metadata = {
                version: "1.0",
                timestamp,
                type: "full",
                data: {
                    collections: collections.map(c => c.toJSON()),
                    tokens: tokens.map(t => t.toJSON()),
                    listings: listings.map(l => l.toJSON())
                },
                counts: {
                    collections: collections.length,
                    tokens: tokens.length,
                    listings: listings.length
                }
            };
            const backupResult = await this.processBackup(backupId, metadata, "full");
            await this.storeBackupRecord(backupResult);
            console_1.logger.success("BACKUP", `Full backup completed: ${backupId}`);
            return backupResult;
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to create full backup", error);
            throw error;
        }
    }
    async createIncrementalBackup(sinceDate) {
        try {
            const backupId = crypto.randomUUID();
            const timestamp = new Date();
            const since = sinceDate || new Date(Date.now() - this.config.backupInterval);
            console_1.logger.info("BACKUP", `Starting incremental backup since ${since.toISOString()}`);
            const [collections, tokens, listings] = await Promise.all([
                db_1.models.nftCollection.findAll({
                    where: {
                        [sequelize_1.Op.or]: [
                            { createdAt: { [sequelize_1.Op.gte]: since } },
                            { updatedAt: { [sequelize_1.Op.gte]: since } }
                        ]
                    }
                }),
                db_1.models.nftToken.findAll({
                    where: {
                        [sequelize_1.Op.or]: [
                            { createdAt: { [sequelize_1.Op.gte]: since } },
                            { updatedAt: { [sequelize_1.Op.gte]: since } }
                        ]
                    }
                }),
                db_1.models.nftListing.findAll({
                    where: {
                        [sequelize_1.Op.or]: [
                            { createdAt: { [sequelize_1.Op.gte]: since } },
                            { updatedAt: { [sequelize_1.Op.gte]: since } }
                        ]
                    }
                })
            ]);
            const metadata = {
                version: "1.0",
                timestamp,
                type: "incremental",
                since,
                data: {
                    collections: collections.map(c => c.toJSON()),
                    tokens: tokens.map(t => t.toJSON()),
                    listings: listings.map(l => l.toJSON())
                },
                counts: {
                    collections: collections.length,
                    tokens: tokens.length,
                    listings: listings.length
                }
            };
            const backupResult = await this.processBackup(backupId, metadata, "incremental");
            await this.storeBackupRecord(backupResult);
            console_1.logger.success("BACKUP", `Incremental backup completed: ${backupId}`);
            return backupResult;
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to create incremental backup", error);
            throw error;
        }
    }
    async processBackup(backupId, data, type) {
        try {
            let processedData = Buffer.from(JSON.stringify(data, null, 2));
            const checksum = crypto.createHash('sha256').update(processedData).digest('hex');
            if (this.config.compressionEnabled) {
                processedData = Buffer.from(await gzip(processedData));
            }
            if (this.config.encryptionEnabled && this.encryptionKey) {
                processedData = Buffer.from(this.encrypt(processedData));
            }
            const locations = {};
            if (this.config.localEnabled) {
                const localPath = await this.storeLocal(backupId, processedData);
                locations.local = localPath;
            }
            if (this.config.s3Enabled && this.s3Client) {
                const s3Url = await this.storeS3(backupId, processedData);
                locations.s3 = s3Url;
            }
            if (this.config.ipfsEnabled && this.ipfsService) {
                const ipfsCid = await this.storeIPFS(backupId, processedData);
                locations.ipfs = ipfsCid;
            }
            return {
                id: backupId,
                timestamp: new Date(),
                type,
                size: processedData.length,
                checksum,
                locations,
                encrypted: this.config.encryptionEnabled,
                compressed: this.config.compressionEnabled
            };
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to process backup", error);
            throw error;
        }
    }
    async storeLocal(backupId, data) {
        try {
            const fileName = `backup_${backupId}_${Date.now()}.bak`;
            const filePath = path.join(this.backupPath, fileName);
            await fs.writeFile(filePath, data);
            return filePath;
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to store backup locally", error);
            throw error;
        }
    }
    async storeS3(backupId, data) {
        try {
            const bucketName = process.env.S3_BACKUP_BUCKET || "nft-metadata-backups";
            const key = `backups/${backupId}/${Date.now()}.bak`;
            throw (0, error_1.createError)({ statusCode: 503, message: "AWS SDK not available" });
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to store backup on S3", error);
            throw error;
        }
    }
    async storeIPFS(backupId, data) {
        try {
            const result = await this.ipfsService.uploadFile(data, {
                type: "metadata-backup",
                backupId,
                timestamp: new Date().toISOString()
            });
            await this.ipfsService.pinCID(result.cid);
            return result.cid;
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to store backup on IPFS", error);
            throw error;
        }
    }
    async restoreFromBackup(backupId) {
        try {
            console_1.logger.info("BACKUP", `Starting restore from backup: ${backupId}`);
            if (!db_1.models.nftMetadataBackup) {
                console_1.logger.warn("BACKUP", "nftMetadataBackup model not available - backup restore disabled");
                return false;
            }
            const backup = await db_1.models.nftMetadataBackup.findOne({
                where: { backupId }
            });
            if (!backup) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Backup not found" });
            }
            let data = null;
            if (backup.locations.local) {
                data = await fs.readFile(backup.locations.local);
            }
            else if (backup.locations.s3) {
                data = await this.retrieveFromS3(backup.locations.s3);
            }
            else if (backup.locations.ipfs) {
                data = await this.ipfsService.getFile(backup.locations.ipfs);
            }
            if (!data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Could not retrieve backup data" });
            }
            if (backup.encrypted && this.encryptionKey) {
                data = this.decrypt(data);
            }
            if (backup.compressed) {
                data = await gunzip(data);
            }
            const metadata = JSON.parse(data.toString());
            await db_1.sequelize.transaction(async (t) => {
                if (metadata.type === "full") {
                    await db_1.models.nftToken.destroy({ where: {}, transaction: t });
                    await db_1.models.nftListing.destroy({ where: {}, transaction: t });
                    await db_1.models.nftCollection.destroy({ where: {}, transaction: t });
                }
                if (metadata.data.collections) {
                    await db_1.models.nftCollection.bulkCreate(metadata.data.collections, { transaction: t, updateOnDuplicate: ["metadata", "updatedAt"] });
                }
                if (metadata.data.tokens) {
                    await db_1.models.nftToken.bulkCreate(metadata.data.tokens, { transaction: t, updateOnDuplicate: ["ownerId", "updatedAt"] });
                }
                if (metadata.data.listings) {
                    await db_1.models.nftListing.bulkCreate(metadata.data.listings, { transaction: t, updateOnDuplicate: ["price", "status", "updatedAt"] });
                }
            });
            console_1.logger.success("BACKUP", `Restore completed from backup: ${backupId}`);
            return true;
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to restore from backup", error);
            throw error;
        }
    }
    async retrieveFromS3(s3Url) {
        try {
            const match = s3Url.match(/s3:\/\/([^/]+)\/(.+)/);
            if (!match)
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid S3 URL" });
            const [, bucket, key] = match;
            throw (0, error_1.createError)({ statusCode: 503, message: "AWS SDK not available" });
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to retrieve from S3", error);
            throw error;
        }
    }
    encrypt(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        return Buffer.concat([iv, encrypted]);
    }
    decrypt(data) {
        const iv = data.slice(0, 16);
        const encrypted = data.slice(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
    async storeBackupRecord(backup) {
        try {
            if (!db_1.models.nftMetadataBackup) {
                return;
            }
            await db_1.models.nftMetadataBackup.create({
                backupId: backup.id,
                type: backup.type,
                size: backup.size,
                checksum: backup.checksum,
                locations: backup.locations,
                encrypted: backup.encrypted,
                compressed: backup.compressed,
                createdAt: backup.timestamp
            });
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to store backup record", error);
        }
    }
    async cleanOldBackups() {
        try {
            if (!db_1.models.nftMetadataBackup) {
                return;
            }
            const cutoffDate = new Date(Date.now() - this.config.retentionDays * 86400000);
            const oldBackups = await db_1.models.nftMetadataBackup.findAll({
                where: {
                    createdAt: { [sequelize_1.Op.lt]: cutoffDate },
                    type: "incremental"
                }
            });
            for (const backup of oldBackups) {
                if (backup.locations.local) {
                    try {
                        await fs.unlink(backup.locations.local);
                    }
                    catch (error) {
                        console_1.logger.error("BACKUP", "Failed to delete local backup", error);
                    }
                }
                if (backup.locations.s3 && this.s3Client) {
                    try {
                        const match = backup.locations.s3.match(/s3:\/\/([^/]+)\/(.+)/);
                        if (match) {
                            const [, bucket, key] = match;
                            throw (0, error_1.createError)({ statusCode: 503, message: "AWS SDK not available" });
                        }
                    }
                    catch (error) {
                        console_1.logger.error("BACKUP", "Failed to delete S3 backup", error);
                    }
                }
                await backup.destroy();
            }
            console_1.logger.info("BACKUP", `Cleaned ${oldBackups.length} old backups`);
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to clean old backups", error);
        }
    }
    async verifyBackup(backupId) {
        try {
            if (!db_1.models.nftMetadataBackup) {
                return false;
            }
            const backup = await db_1.models.nftMetadataBackup.findOne({
                where: { backupId }
            });
            if (!backup) {
                return false;
            }
            let data = null;
            if (backup.locations.local) {
                data = await fs.readFile(backup.locations.local);
            }
            else if (backup.locations.s3) {
                data = await this.retrieveFromS3(backup.locations.s3);
            }
            else if (backup.locations.ipfs) {
                data = await this.ipfsService.getFile(backup.locations.ipfs);
            }
            if (!data) {
                return false;
            }
            if (backup.encrypted && this.encryptionKey) {
                data = this.decrypt(data);
            }
            if (backup.compressed) {
                data = await gunzip(data);
            }
            const checksum = crypto.createHash('sha256').update(data).digest('hex');
            return checksum === backup.checksum;
        }
        catch (error) {
            console_1.logger.error("BACKUP", "Failed to verify backup", error);
            return false;
        }
    }
}
exports.MetadataBackupService = MetadataBackupService;
let backupService;
function getMetadataBackupService() {
    if (!backupService) {
        backupService = new MetadataBackupService();
    }
    return backupService;
}
async function startBackupSchedule() {
    const service = getMetadataBackupService();
    const intervalHours = parseInt(process.env.BACKUP_INTERVAL_HOURS || "6");
    await service.createFullBackup();
    setInterval(async () => {
        await service.createIncrementalBackup();
    }, intervalHours * 3600000);
    setInterval(async () => {
        await service.createFullBackup();
    }, 7 * 24 * 3600000);
    setInterval(async () => {
        await service.cleanOldBackups();
    }, 24 * 3600000);
    console_1.logger.success("BACKUP", "Automated backup schedule started");
}
