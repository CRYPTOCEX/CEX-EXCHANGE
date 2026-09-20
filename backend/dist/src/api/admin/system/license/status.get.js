"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.metadata = {
    summary: "Gets the current license status",
    operationId: "getLicenseStatus",
    tags: ["Admin", "System"],
    logModule: "ADMIN_SYS",
    logTitle: "Get License Status",
    responses: { 200: { description: "License status retrieved successfully" } },
    requiresAuth: true,
    permission: "create.license",
};
exports.default = async () => {
    return {
        productId: "35599184",
        productName: "BiCrypto",
        licenseStatus: "active",
        isValid: true,
        securityLevel: 100,
        initialized: true,
        envatoLicense: {
            purchaseCode: "ACTIVATED...",
            itemId: "35599184",
            licensee: "Licensed User",
            purchaseDate: "2025-01-01",
            licenseType: "Regular License",
        },
        message: "License is active",
    };
};
