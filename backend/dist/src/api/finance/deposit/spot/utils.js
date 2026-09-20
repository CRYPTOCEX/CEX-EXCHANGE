"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTransactionMetadata = parseTransactionMetadata;
exports.releaseDepositReference = releaseDepositReference;
exports.parseMetadataAndMapChainToXt = parseMetadataAndMapChainToXt;
exports.mapToXtNetwork = mapToXtNetwork;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
function parseTransactionMetadata(metadata) {
    if (!metadata)
        return {};
    if (typeof metadata === "string") {
        try {
            let metadataStr = metadata;
            if (!isValidJSON(metadataStr)) {
                metadataStr = unescapeString(metadataStr);
            }
            let parsedMetadata = JSON.parse(metadataStr);
            if (typeof parsedMetadata === "string") {
                try {
                    parsedMetadata = JSON.parse(parsedMetadata.trim());
                }
                catch (error) {
                    console_1.logger.error("WALLET", "Error parsing transaction metadata on second attempt", error);
                    return {};
                }
            }
            return parsedMetadata;
        }
        catch (error) {
            console_1.logger.error("WALLET", "Error parsing transaction metadata on first attempt", error);
            return {};
        }
    }
    return metadata || {};
}
async function releaseDepositReference(id, status, description) {
    var _a, _b, _c;
    const row = await db_1.models.transaction.findByPk(id);
    if (!row)
        return 0;
    const metadata = parseTransactionMetadata(row.metadata);
    const [released] = await db_1.models.transaction.update({
        status,
        referenceId: null,
        description: description !== null && description !== void 0 ? description : row.description,
        metadata: JSON.stringify({
            ...metadata,
            trx: (_b = (_a = metadata.trx) !== null && _a !== void 0 ? _a : row.referenceId) !== null && _b !== void 0 ? _b : null,
            releasedReferenceId: (_c = row.referenceId) !== null && _c !== void 0 ? _c : null,
            releasedAt: new Date().toISOString(),
        }),
    }, { where: { id, status: "PENDING" } });
    return released;
}
function parseMetadataAndMapChainToXt(metadata) {
    const parsedMetadata = parseTransactionMetadata(metadata);
    const xtChain = mapToXtNetwork(parsedMetadata.chain);
    return {
        metadata: parsedMetadata,
        xtChain
    };
}
function mapToXtNetwork(chain) {
    if (!chain)
        return null;
    const chainMapping = {
        'TRC20': 'Tron',
        'TRX': 'Tron',
        'ERC20': 'Ethereum',
        'ETH': 'Ethereum',
        'BEP20': 'BNB Smart Chain',
        'BSC': 'BNB Smart Chain',
        'BNB': 'BNB Smart Chain',
        'POLYGON': 'Polygon',
        'MATIC': 'Polygon',
        'ARBITRUM': 'ARB',
        'ARB': 'ARB',
        'OPTIMISM': 'OPT',
        'OPT': 'OPT',
        'AVAX': 'AVAX C-Chain',
        'AVALANCHE': 'AVAX C-Chain',
        'SOL': 'SOL-SOL',
        'SOLANA': 'SOL-SOL',
        'BTC': 'Bitcoin',
        'BITCOIN': 'Bitcoin',
        'LTC': 'Litecoin',
        'LITECOIN': 'Litecoin',
        'DOGE': 'Dogecoin',
        'DOGECOIN': 'Dogecoin',
        'BASE': 'BASE',
        'ETC': 'Ethereum Classic',
        'BCH': 'Bitcoin Cash'
    };
    return chainMapping[chain.toUpperCase()] || null;
}
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
function unescapeString(str) {
    return str.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
