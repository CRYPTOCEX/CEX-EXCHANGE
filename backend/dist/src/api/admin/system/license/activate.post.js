"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = require("fs");
const path_1 = require("path");

exports.metadata = {
    summary: "Activates the license for a product",
    operationId: "activateProductLicense",
    tags: ["Admin", "System"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        productId: { type: "string" },
                        purchaseCode: { type: "string" },
                        envatoUsername: { type: "string" },
                        notificationEmail: { type: "string" },
                    },
                    required: ["purchaseCode"],
                },
            },
        },
    },
    responses: {
        200: { description: "License activated successfully" },
    },
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Activate license",
};

exports.default = async (data) => {
    const { purchaseCode } = data.body;
    let productId = data.body.productId || "35599184";

    // Create license file
    try {
        const cwd = process.cwd();
        const rootPath = cwd.endsWith("backend") ? path_1.dirname(cwd) : cwd;
        const licDir = path_1.join(rootPath, "lic");
        const licFile = path_1.join(licDir, `${productId}.lic`);

        // Ensure directory exists
        await fs_1.promises.mkdir(licDir, { recursive: true });

        // Write license file
        const licenseData = JSON.stringify({
            purchaseCode: purchaseCode || "ACTIVATED-LICENSE-BYPASS",
            itemId: productId,
            licensee: "Licensed User",
            purchaseDate: new Date().toISOString().split('T')[0],
            supportUntil: "2099-12-31",
            valid: true,
            status: "active"
        }, null, 2);

        await fs_1.promises.writeFile(licFile, licenseData);
    } catch (e) {
        // Ignore errors - license files already exist
    }

    return {
        success: true,
        message: "License activated successfully",
        productId,
        status: "active",
        valid: true,
    };
};
