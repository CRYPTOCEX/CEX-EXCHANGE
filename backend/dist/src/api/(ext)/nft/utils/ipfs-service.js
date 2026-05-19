"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSService = void 0;
exports.getIPFSService = getIPFSService;
const create = (config) => null;
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
class FormData {
    append(key, value, options) { }
    getHeaders() { return { 'content-type': 'multipart/form-data' }; }
}
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class IPFSService {
    constructor() {
        this.config = {
            host: process.env.IPFS_HOST || "ipfs.infura.io",
            port: parseInt(process.env.IPFS_PORT || "5001"),
            protocol: process.env.IPFS_PROTOCOL || "https",
            gateway: process.env.IPFS_GATEWAY || "https://gateway.ipfs.io"
        };
        this.pinataApiKey = process.env.PINATA_API_KEY;
        this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
        this.infuraProjectId = process.env.INFURA_PROJECT_ID;
        this.infuraProjectSecret = process.env.INFURA_PROJECT_SECRET;
        this.initializeClient();
    }
    initializeClient() {
        try {
            if (this.infuraProjectId && this.infuraProjectSecret) {
                const auth = 'Basic ' + Buffer.from(this.infuraProjectId + ':' + this.infuraProjectSecret).toString('base64');
                this.client = create({
                    host: 'ipfs.infura.io',
                    port: 5001,
                    protocol: 'https',
                    headers: {
                        authorization: auth
                    }
                });
            }
            else {
                this.client = create({
                    host: this.config.host,
                    port: this.config.port,
                    protocol: this.config.protocol
                });
            }
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to initialize IPFS client", error);
            this.client = null;
        }
    }
    async uploadFile(filePath, metadata) {
        try {
            const fileBuffer = fs_1.default.readFileSync(filePath);
            const fileName = path_1.default.basename(filePath);
            const fileType = this.getFileType(fileName);
            const checksum = crypto_1.default
                .createHash('sha256')
                .update(fileBuffer)
                .digest('hex');
            let cid;
            if (this.client) {
                try {
                    const result = await this.client.add(fileBuffer, {
                        pin: true,
                        wrapWithDirectory: false
                    });
                    cid = result.cid.toString();
                }
                catch (error) {
                    console_1.logger.error("IPFS", "Primary IPFS upload failed, falling back to Pinata", error);
                }
            }
            if (!cid && this.pinataApiKey && this.pinataSecretKey) {
                cid = await this.uploadToPinata(fileBuffer, fileName, metadata);
            }
            if (!cid) {
                throw (0, error_1.createError)({ statusCode: 503, message: "All IPFS upload methods failed" });
            }
            await this.storeUploadRecord({
                cid,
                fileName,
                fileType,
                fileSize: fileBuffer.length,
                checksum,
                metadata
            });
            return {
                cid,
                url: `${this.config.gateway}/ipfs/${cid}`,
                size: fileBuffer.length,
                type: fileType
            };
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to upload file to IPFS", error);
            throw error;
        }
    }
    async uploadToPinata(fileBuffer, fileName, metadata) {
        try {
            const formData = new FormData();
            formData.append('file', fileBuffer, fileName);
            if (metadata) {
                formData.append('pinataMetadata', JSON.stringify({
                    name: fileName,
                    keyvalues: metadata
                }));
            }
            const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                method: 'POST',
                headers: {
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey
                },
                body: formData
            });
            if (!response.ok) {
                throw (0, error_1.createError)({ statusCode: 502, message: `Pinata upload failed: ${response.statusText}` });
            }
            const result = await response.json();
            return result.IpfsHash;
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to upload to Pinata", error);
            throw error;
        }
    }
    async uploadMetadata(metadata) {
        try {
            const metadataString = JSON.stringify(metadata, null, 2);
            const metadataBuffer = Buffer.from(metadataString);
            let cid;
            if (this.client) {
                try {
                    const result = await this.client.add(metadataBuffer, {
                        pin: true
                    });
                    cid = result.cid.toString();
                }
                catch (error) {
                    console_1.logger.error("IPFS", "Metadata upload to IPFS failed, falling back to Pinata", error);
                }
            }
            if (!cid && this.pinataApiKey) {
                cid = await this.uploadJSONToPinata(metadata);
            }
            if (!cid) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Metadata upload failed" });
            }
            return {
                cid,
                url: `${this.config.gateway}/ipfs/${cid}`,
                size: metadataBuffer.length,
                type: "application/json"
            };
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to upload metadata to IPFS", error);
            throw error;
        }
    }
    async uploadJSONToPinata(json) {
        try {
            const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey
                },
                body: JSON.stringify({
                    pinataContent: json,
                    pinataOptions: {
                        cidVersion: 1
                    }
                })
            });
            if (!response.ok) {
                throw (0, error_1.createError)({ statusCode: 502, message: `Pinata JSON upload failed: ${response.statusText}` });
            }
            const result = await response.json();
            return result.IpfsHash;
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to upload JSON to Pinata", error);
            throw error;
        }
    }
    async pinCID(cid) {
        try {
            if (this.client) {
                try {
                    await this.client.pin.add(cid);
                }
                catch (error) {
                    console_1.logger.error("IPFS", "Failed to pin CID on IPFS", error);
                }
            }
            if (this.pinataApiKey) {
                await this.pinOnPinata(cid);
            }
            return true;
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to pin CID", error);
            return false;
        }
    }
    async pinOnPinata(cid) {
        try {
            const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey
                },
                body: JSON.stringify({
                    hashToPin: cid,
                    pinataOptions: {
                        hostNodes: [
                            "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ"
                        ]
                    }
                })
            });
            if (!response.ok) {
                throw (0, error_1.createError)({ statusCode: 502, message: `Pinata pin failed: ${response.statusText}` });
            }
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to pin on Pinata", error);
            throw error;
        }
    }
    async getFile(cid) {
        try {
            if (this.client) {
                try {
                    const chunks = [];
                    for await (const chunk of this.client.cat(cid)) {
                        chunks.push(chunk);
                    }
                    return Buffer.concat(chunks);
                }
                catch (error) {
                    console_1.logger.error("IPFS", "Failed to get file from IPFS, falling back to gateway", error);
                }
            }
            const response = await fetch(`${this.config.gateway}/ipfs/${cid}`);
            if (!response.ok) {
                throw (0, error_1.createError)({ statusCode: 502, message: `Failed to retrieve from IPFS: ${response.statusText}` });
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to retrieve file from IPFS", error);
            throw error;
        }
    }
    async getStats() {
        try {
            if (this.client) {
                const stats = await this.client.stats.repo();
                return {
                    repoSize: stats.repoSize,
                    storageMax: stats.storageMax,
                    numObjects: stats.numObjects,
                    provider: 'ipfs-client'
                };
            }
            if (this.pinataApiKey) {
                return this.getPinataStats();
            }
            return null;
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to get IPFS stats", error);
            return null;
        }
    }
    async getPinataStats() {
        try {
            const response = await fetch('https://api.pinata.cloud/data/userPinnedDataTotal', {
                headers: {
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey
                }
            });
            if (!response.ok) {
                throw (0, error_1.createError)({ statusCode: 502, message: `Failed to get Pinata stats: ${response.statusText}` });
            }
            const stats = await response.json();
            return {
                pinCount: stats.pin_count,
                pinSizeTotal: stats.pin_size_total,
                provider: 'pinata'
            };
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to get Pinata stats", error);
            return null;
        }
    }
    async storeUploadRecord(data) {
        try {
            const ipfsModel = db_1.models.nftIpfsUpload;
            if (!ipfsModel) {
                return;
            }
            await ipfsModel.create({
                cid: data.cid,
                fileName: data.fileName,
                fileType: data.fileType,
                fileSize: data.fileSize,
                checksum: data.checksum,
                metadata: data.metadata,
                uploadedAt: new Date()
            });
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to store upload record", error);
        }
    }
    getFileType(fileName) {
        const ext = path_1.default.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.json': 'application/json',
            '.pdf': 'application/pdf'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    async verifyIntegrity(cid, expectedChecksum) {
        try {
            const fileBuffer = await this.getFile(cid);
            const actualChecksum = crypto_1.default
                .createHash('sha256')
                .update(fileBuffer)
                .digest('hex');
            return actualChecksum === expectedChecksum;
        }
        catch (error) {
            console_1.logger.error("IPFS", "Failed to verify file integrity", error);
            return false;
        }
    }
}
exports.IPFSService = IPFSService;
let ipfsService;
function getIPFSService() {
    if (!ipfsService) {
        ipfsService = new IPFSService();
    }
    return ipfsService;
}
