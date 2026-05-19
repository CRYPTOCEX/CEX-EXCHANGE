"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTransactionMetadata = parseTransactionMetadata;
exports.parseMetadataAndMapChainToXt = parseMetadataAndMapChainToXt;
exports.mapToXtNetwork = mapToXtNetwork;
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
