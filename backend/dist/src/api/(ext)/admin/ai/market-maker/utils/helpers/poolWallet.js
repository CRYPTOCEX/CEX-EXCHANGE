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
exports.getPoolAdminWallet = getPoolAdminWallet;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
async function getPoolAdminWallet(userId, currency, options = {}) {
    const existing = await db_1.models.wallet.findOne({
        where: { userId, currency, type: "ECO" },
    });
    if (existing)
        return existing;
    if (!options.createIfMissing)
        return null;
    try {
        const { getWalletByUserIdAndCurrency } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/wallet")));
        return await getWalletByUserIdAndCurrency(userId, currency, "ECO");
    }
    catch (error) {
        throw (0, error_1.createError)(400, `No ${currency} wallet exists for this account, and one could not be created: ` +
            `${(error === null || error === void 0 ? void 0 : error.message) || error}. Fund the account with ${currency} first.`);
    }
}
