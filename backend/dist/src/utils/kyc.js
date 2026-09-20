"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYC_FEATURES = void 0;
exports.isKycFeatureEnforcementEnabled = isKycFeatureEnforcementEnabled;
exports.assertKycFeature = assertKycFeature;
exports.assertKycFeatureOrLegacy = assertKycFeatureOrLegacy;
exports.hasKycFeature = hasKycFeature;
exports.getEffectiveKycStatus = getEffectiveKycStatus;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
exports.KYC_FEATURES = {
    TRADE: "trade",
    BINARY_TRADING: "binary_trading",
    DEPOSIT_FOREX: "deposit_forex",
    WITHDRAW_FOREX: "withdraw_forex",
    TRADE_FOREX: "trade_forex",
    CREATE_FOREX_ACCOUNT: "create_forex_account",
    FUTURES_TRADING: "futures_trading",
    VIEW_WALLETS: "view_wallets",
    DEPOSIT_WALLET: "deposit_wallet",
    WITHDRAW_WALLET: "withdraw_wallet",
    TRANSFER_WALLETS: "transfer_wallets",
    API_KEYS: "api_keys",
    AUTHOR_BLOG: "author_blog",
    COMMENT_BLOG: "comment_blog",
    VIEW_ECOMMERCE: "view_ecommerce",
    ORDER_ECOMMERCE: "order_ecommerce",
    INVEST_FOREX: "invest_forex",
    INVEST_GENERAL: "invest_general",
    INVEST_AI: "invest_ai",
    PURCHASE_ICO: "purchase_ico",
    CREATE_ICO: "create_ico",
    AFFILIATE_MLM: "affiliate_mlm",
    WITHDRAW_AFFILIATE: "withdraw_affiliate",
    MAKE_P2P_OFFER: "make_p2p_offer",
    BUY_P2P_OFFER: "buy_p2p_offer",
    INVEST_STAKING: "invest_staking",
    WITHDRAW_STAKING: "withdraw_staking",
    ASK_FAQ: "ask_faq",
    SUPPORT_TICKET: "support_ticket",
    CREATE_NFT: "create_nft",
    BUY_NFT: "buy_nft",
    SELL_NFT: "sell_nft",
    TRANSFER_NFT: "transfer_nft",
    DEPLOY_NFT_CONTRACT: "deploy_nft_contract",
    USE_GATEWAY: "use_gateway",
    COPY_TRADERS: "copy_traders",
    BECOME_TRADER: "become_trader",
    VIEW_TRADING_BOT: "view_trading_bot",
    TRADE_BOT_LIVE: "trade_bot_live",
    BUY_BOT_STRATEGY: "buy_bot_strategy",
    BECOME_BOT_SELLER: "become_bot_seller",
    VIEW_HB: "view_hb",
    VIEW_DEX: "view_dex",
    SWAP_DEX: "swap_dex",
    SWAP_DIRECT: "swap_direct",
};
const truthy = (v) => v === true || v === 1 || v === "true" || v === "1" || v === "on";
async function isKycFeatureEnforcementEnabled() {
    try {
        const cache = cache_1.CacheManager.getInstance();
        if (!truthy(await cache.getSetting("kycStatus")))
            return false;
        return truthy(await cache.getSetting("kycFeatureEnforcement"));
    }
    catch (_a) {
        return false;
    }
}
async function assertKycFeature(userId, feature, action) {
    if (!userId)
        return;
    if (!(await isKycFeatureEnforcementEnabled()))
        return;
    let applications = [];
    try {
        applications = await db_1.models.kycApplication.findAll({
            where: { userId },
            include: [{ model: db_1.models.kycLevel, as: "level" }],
        });
    }
    catch (_a) {
        applications = [];
    }
    const status = getEffectiveKycStatus(applications);
    if (status.isVerified && status.features.includes(feature))
        return;
    throw (0, error_1.createError)({
        statusCode: 403,
        message: status.isVerified
            ? `Your verification level does not include this feature${action ? ` (${action})` : ""}. Complete a higher verification level to continue.`
            : `KYC verification is required${action ? ` to ${action}` : ""}.`,
    });
}
async function assertKycFeatureOrLegacy(userId, feature, legacy, action) {
    var _a;
    if (!userId)
        return;
    if (await isKycFeatureEnforcementEnabled()) {
        return assertKycFeature(userId, feature, action);
    }
    let kycEnabled = false;
    try {
        kycEnabled = truthy(await cache_1.CacheManager.getInstance().getSetting("kycStatus"));
    }
    catch (_b) {
        return;
    }
    if (!kycEnabled)
        return;
    let applications = [];
    try {
        applications = await db_1.models.kycApplication.findAll({
            where: { userId },
            include: [{ model: db_1.models.kycLevel, as: "level" }],
        });
    }
    catch (_c) {
        applications = [];
    }
    const status = getEffectiveKycStatus(applications);
    const minLevel = (_a = legacy.minLevel) !== null && _a !== void 0 ? _a : 0;
    if (!status.isVerified) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `KYC verification is required${action ? ` to ${action}` : ""}.`,
        });
    }
    if (minLevel > 0 && status.level < minLevel) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `KYC level ${minLevel} verification is required${action ? ` to ${action}` : ""}.`,
        });
    }
}
async function hasKycFeature(userId, feature) {
    try {
        await assertKycFeature(userId, feature);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function getEffectiveKycStatus(applications) {
    if (!applications || applications.length === 0) {
        return {
            isVerified: false,
            level: 0,
            features: [],
            effectiveApplication: null,
            allApplications: [],
        };
    }
    const approvedApps = applications.filter((app) => app.status === "APPROVED");
    if (approvedApps.length === 0) {
        return {
            isVerified: false,
            level: 0,
            features: [],
            effectiveApplication: null,
            allApplications: applications,
        };
    }
    const levelNumberOf = (app) => {
        var _a;
        var _b;
        const lvl = (_a = app === null || app === void 0 ? void 0 : app.level) === null || _a === void 0 ? void 0 : _a.level;
        if (typeof lvl === "number")
            return lvl;
        const flat = (_b = app === null || app === void 0 ? void 0 : app.levelNumber) !== null && _b !== void 0 ? _b : app === null || app === void 0 ? void 0 : app.level;
        return typeof flat === "number" ? flat : 0;
    };
    approvedApps.sort((a, b) => levelNumberOf(b) - levelNumberOf(a));
    const highestApproved = approvedApps[0];
    const allFeatures = new Set();
    for (const app of approvedApps) {
        const levelData = app.level;
        if (levelData === null || levelData === void 0 ? void 0 : levelData.features) {
            try {
                const features = typeof levelData.features === "string"
                    ? JSON.parse(levelData.features)
                    : levelData.features;
                if (Array.isArray(features)) {
                    features.forEach((f) => allFeatures.add(f));
                }
            }
            catch (_a) {
            }
        }
    }
    return {
        isVerified: true,
        level: levelNumberOf(highestApproved),
        features: Array.from(allFeatures),
        effectiveApplication: highestApproved,
        allApplications: applications,
    };
}
