"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidIPFSUrl = isValidIPFSUrl;
exports.validateIPFSMetadata = validateIPFSMetadata;
exports.quickValidateIPFSUrl = quickValidateIPFSUrl;
const console_1 = require("@b/utils/console");
function isValidIPFSUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    const ipfsPatterns = [
        /^ipfs:\/\/[a-zA-Z0-9]+$/,
        /^https?:\/\/ipfs\.io\/ipfs\/[a-zA-Z0-9]+/,
        /^https?:\/\/gateway\.ipfs\.io\/ipfs\/[a-zA-Z0-9]+/,
        /^https?:\/\/[a-zA-Z0-9-]+\.ipfs\.[a-zA-Z0-9.-]+\//,
        /^https?:\/\/gateway\.pinata\.cloud\/ipfs\/[a-zA-Z0-9]+/,
        /^https?:\/\/[a-zA-Z0-9]+\.ipfs\.nftstorage\.link/,
        /^https?:\/\/[a-zA-Z0-9]+\.ipfs\.w3s\.link/,
    ];
    return ipfsPatterns.some(pattern => pattern.test(url));
}
async function validateIPFSMetadata(metadataUrl, imageUrl) {
    const errors = [];
    try {
        if (!isValidIPFSUrl(metadataUrl)) {
            errors.push("Metadata URL is not a valid IPFS URL");
        }
        if (!isValidIPFSUrl(imageUrl)) {
            errors.push("Image URL is not a valid IPFS URL");
        }
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const httpUrl = convertIPFSToHTTP(metadataUrl);
            const response = await fetch(httpUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeout);
            if (!response.ok) {
                errors.push(`Failed to fetch metadata: HTTP ${response.status}`);
                return { valid: false, errors };
            }
            const metadata = await response.json();
            if (!metadata || typeof metadata !== 'object') {
                errors.push("Metadata is not a valid JSON object");
                return { valid: false, errors };
            }
            if (!metadata.name || typeof metadata.name !== 'string') {
                errors.push("Metadata missing required 'name' field");
            }
            if (!metadata.image || typeof metadata.image !== 'string') {
                errors.push("Metadata missing required 'image' field");
            }
            if (metadata.image && !isValidIPFSUrl(metadata.image)) {
                errors.push("Image URL in metadata is not a valid IPFS URL");
            }
            if (metadata.image && imageUrl) {
                const normalizedMetadataImage = normalizeIPFSUrl(metadata.image);
                const normalizedProvidedImage = normalizeIPFSUrl(imageUrl);
                if (normalizedMetadataImage !== normalizedProvidedImage) {
                    console_1.logger.warn("NFT", `Metadata image (${normalizedMetadataImage}) doesn't match provided image (${normalizedProvidedImage})`);
                }
            }
            return {
                valid: errors.length === 0,
                errors,
                metadata
            };
        }
        catch (fetchError) {
            if (fetchError.name === 'AbortError') {
                errors.push("Metadata fetch timeout - IPFS gateway may be slow or unreachable");
            }
            else {
                errors.push(`Failed to fetch metadata: ${fetchError.message}`);
            }
            return { valid: false, errors };
        }
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to validate IPFS metadata", error);
        errors.push(`Validation error: ${error.message}`);
        return { valid: false, errors };
    }
}
function convertIPFSToHTTP(ipfsUrl) {
    if (ipfsUrl.startsWith('http')) {
        return ipfsUrl;
    }
    if (ipfsUrl.startsWith('ipfs://')) {
        const hash = ipfsUrl.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${hash}`;
    }
    return ipfsUrl;
}
function normalizeIPFSUrl(url) {
    const hashMatch = url.match(/([Qm][a-zA-Z0-9]{44,}|[a-z0-9]{59,})/);
    return hashMatch ? hashMatch[0] : url;
}
function quickValidateIPFSUrl(url) {
    if (!url) {
        return { valid: false, error: "URL is required" };
    }
    if (!isValidIPFSUrl(url)) {
        return { valid: false, error: "URL is not a valid IPFS format" };
    }
    return { valid: true };
}
