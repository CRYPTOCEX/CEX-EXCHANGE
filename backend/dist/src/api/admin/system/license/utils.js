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
exports.refreshLicenseCaches = refreshLicenseCaches;
const security_1 = require("@b/utils/security");
const Middleware_1 = require("@b/handler/Middleware");
const console_1 = require("@b/utils/console");
async function refreshLicenseCaches(productId) {
    try {
        await (0, security_1.getValidator)(productId).clearCache();
    }
    catch (error) {
        console_1.logger.warn("LICENSE", `Could not clear validator cache for ${productId}: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    try {
        await security_1.SecurityManager.getInstance().revalidate();
    }
    catch (error) {
        console_1.logger.warn("LICENSE", `Security revalidation after activation failed: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    try {
        const { invalidateCoreLicenseCache } = await Promise.resolve().then(() => __importStar(require("@b/server")));
        invalidateCoreLicenseCache();
    }
    catch (error) {
        console_1.logger.warn("LICENSE", `Could not invalidate core license cache: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    (0, Middleware_1.clearExtensionLicenseCache)();
}
