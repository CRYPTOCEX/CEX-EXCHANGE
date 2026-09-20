'use strict';

class SecurityManager {
    static _instance = null;
    static getInstance() {
        if (!SecurityManager._instance) SecurityManager._instance = new SecurityManager();
        return SecurityManager._instance;
    }
    async revalidate() { return { valid: true, status: 'active' }; }
    async initialize() { return true; }
    getStatus() {
        return { initialized: true, licenseValid: true, securityLevel: 100, license: { valid: true, status: 'active' } };
    }
}

function getValidator(productId) {
    return {
        async getEnvatoLicenseInfo() {
            return {
                purchaseCode: "ACTIVATED-LICENSE-BYPASS",
                itemId: productId || "35599184",
                licensee: "Licensed User",
                purchaseDate: "2025-01-01",
                supportUntil: "2099-12-31",
                authorUsername: "admin",
                itemTitle: "BiCrypto",
                licenseType: "Regular License",
                valid: true,
                status: "active"
            };
        },
        async forceRevalidate() { return { valid: true, status: 'active', message: 'License valid' }; },
        async validate() { return { valid: true, status: 'active' }; },
        async checkLicense() { return { valid: true, status: 'active' }; }
    };
}

const okLicense = { valid: true, status: 'active', productId: '35599184', expiresAt: null };

async function readLicenseFile() {
    return {
        purchaseCode: "ACTIVATED-LICENSE-BYPASS",
        itemId: "35599184",
        licensee: "Licensed User",
        valid: true,
        status: "active"
    };
}
async function writeLicenseFile() { return true; }

const exports_obj = {
    SecurityManager,
    getValidator,
    registerServerInstance: () => {},
    registerSecurityToken: () => {},
    initializeSecurity: async () => true,
    getSecurityStatus: () => ({ initialized: true, licenseValid: true, securityLevel: 100, license: { ...okLicense } }),
    getSecurityLevel: () => 100,
    registerLicenseMiddleware: () => {},
    startMiddlewareMonitoring: () => {},
    reportTampering: () => {},
    trackServerActivity: () => {},
    verifyValidatorIntegrity: () => true,
    verifyMiddlewareActive: () => true,
    verifyRuntimeIntegrity: () => true,
    getModuleChecksum: () => 'valid',
    verifyIntegrity: () => true,
    quickInlineVerify: () => true,
    runPeriodicChecks: () => {},
    getSecurityHealth: () => true,
    performSignatureCheck: () => true,
    verifyCriticalFiles: () => true,
    verifyLicenseNotReplaced: () => true,
    _s: () => true,
    licenseEnforcementGate: (req, res, next) => { if (typeof next === 'function') next(); },
    createLicenseGate: () => (req, res, next) => { if (next) next(); return true; },
    createLicenseCheck: () => (req, res, next) => { if (next) next(); return true; },
    createStrictLicenseGate: () => (req, res, next) => { if (next) next(); return true; },
    createFeatureGate: () => (req, res, next) => { if (next) next(); return true; },
    createFeatureLicenseGate: () => (req, res, next) => { if (next) next(); return true; },
    getLicenseGate: () => (req, res, next) => { if (next) next(); return true; },
    checkLicense: async () => ({ success: true, valid: true, status: 'active' }),
    revalidateLicense: async () => ({ success: true, valid: true, status: 'active' }),
    isBlockchainActive: async () => ({ active: true }),
    isBlockchainLicenseValid: async () => true,
    isBlockchainEnabled: async () => true,
    checkLicenseFile: async () => true,
    readLicenseFile,
    writeLicenseFile,
    getBlockchainProductId: async () => "00000000",
    clearBlockchainLicenseCache: () => {},
    reloadBlockchainProductIds: () => {},
    reloadExtensionProductIds: () => {},
    clearExtensionLicenseCache: () => {},
    isExtensionLicenseValid: async () => true,
    getCachedFingerprint: () => 'bypassed',
    generateFingerprint: async () => 'bypassed',
    isValidUUID: () => true,
    throwValidationError: () => {},
    checkMarketConflict: async () => ({ conflict: false }),
    validateFollowRequest: async () => true,
    validateFundOperation: async () => true,
    validateLeaderApplication: async () => true,
    validateLeaderUpdate: async () => true,
    validateSubscriptionUpdate: async () => true,
    default: {}
};

module.exports = new Proxy(exports_obj, {
    get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === '__esModule') return false;
        return (..._args) => true;
    }
});
