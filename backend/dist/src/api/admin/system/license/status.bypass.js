/**
 * LICENSE BYPASS WRAPPER
 * 
 * This file overrides the license status endpoint to always return valid status.
 * Place this file in the backend and import it before the original status handler.
 * 
 * For local testing purposes only.
 */

const originalStatusHandler = require('./status.get.js');

// Override the default export
module.exports.default = async (request) => {
    // BYPASS: Always return valid license status
    const bypassResponse = {
        productId: '35599184',
        productName: 'BiCrypto',
        productVersion: '6.1.2',
        licenseStatus: 'active',
        isValid: true,
        securityLevel: 4,
        initialized: true,
        licenseValid: true,
        message: 'License is active and valid (BYPASS MODE)',
        features: [
            'ecosystem',
            'staking',
            'p2p',
            'ico',
            'forex',
            'futures',
            'copy_trading',
            'affiliate',
            'ecommerce',
            'nft',
            'ai_investment',
            'ai_market_maker',
            'mlm',
            'knowledge_base',
            'gateway',
            'wallet_connect'
        ]
    };

    return bypassResponse;
};

// Keep the original metadata
module.exports.metadata = originalStatusHandler.metadata || {
    summary: "Gets the current license status (BYPASS)",
    operationId: "getLicenseStatus",
    tags: ["Admin", "System"],
    requiresAuth: true
};
