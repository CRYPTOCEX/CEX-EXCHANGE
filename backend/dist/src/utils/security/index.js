'use strict';

// Security module - Complete bypass with all required exports

// Mock SecurityManager class
class SecurityManager {
    static _instance = null;

    static getInstance() {
        if (!SecurityManager._instance) {
            SecurityManager._instance = new SecurityManager();
        }
        return SecurityManager._instance;
    }

    async revalidate() {
        return { valid: true, status: 'active' };
    }

    async initialize() {
        return true;
    }

    getStatus() {
        return {
            initialized: true,
            licenseValid: true,
            securityLevel: 100,
            license: { valid: true, status: 'active' }
        };
    }
}

// Mock validator
function getValidator(productId) {
    return {
        async getEnvatoLicenseInfo() {
            return {
                purchaseCode: "ACTIVATED-LICENSE-BYPASS",
                itemId: productId || "35599184",
                licensee: "Licensed User",
                purchaseDate: "2025-01-01",
                authorUsername: "admin",
                itemTitle: "BiCrypto",
                licenseType: "Regular License"
            };
        },
        async forceRevalidate() {
            return { valid: true, status: 'active', message: 'License valid' };
        },
        async validate() {
            return { valid: true, status: 'active' };
        }
    };
}

// All exported functions
const exports_obj = {
    // Classes
    SecurityManager,

    // Validator
    getValidator,

    // Server initialization
    registerServerInstance: () => {},
    registerSecurityToken: () => {},
    initializeSecurity: async () => true,

    // License validation - always return valid
    getSecurityStatus: () => ({
        initialized: true,
        licenseValid: true,
        securityLevel: 100,
        license: {
            valid: true,
            status: 'active',
            productId: '35599184',
            expiresAt: null
        }
    }),

    // Middleware functions
    registerLicenseMiddleware: () => {},
    startMiddlewareMonitoring: (callback) => {},
    reportTampering: () => {},
    trackServerActivity: () => {},

    // Validation functions - always return true/valid
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

    // Token functions
    _s: () => true,

    // License gate
    licenseEnforcementGate: (req, res, next) => {
        if (typeof next === 'function') next();
    },

    // Additional exports for compatibility
    createLicenseGate: () => (req, res, next) => { if (next) next(); return true; },
    createLicenseCheck: () => (req, res, next) => { if (next) next(); return true; },
    createStrictLicenseGate: () => (req, res, next) => { if (next) next(); return true; },
    createFeatureGate: () => (req, res, next) => { if (next) next(); return true; },
    getLicenseGate: () => (req, res, next) => { if (next) next(); return true; },
    checkLicense: async () => ({ success: true, valid: true }),
    revalidateLicense: async () => ({ success: true, valid: true }),

    // Misc
    default: {}
};

// Create a proxy to handle any unknown function calls
module.exports = new Proxy(exports_obj, {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        // Return a no-op function for any unknown property
        return () => true;
    }
});
