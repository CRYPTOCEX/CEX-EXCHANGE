"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_BY_EXTENSION = exports.MOBILE_MODULES = void 0;
const kyc_1 = require("@b/utils/kyc");
exports.MOBILE_MODULES = [
    { id: "wallet", extension: null, title: "Wallet", kycFeature: kyc_1.KYC_FEATURES.VIEW_WALLETS, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "markets", extension: null, title: "Markets", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "trade", extension: null, title: "Spot trading", kycFeature: kyc_1.KYC_FEATURES.TRADE, blockedBySetting: null, requiresExtensions: [], requiresAttestation: true, operationalSetting: "spotWallets" },
    { id: "account", extension: null, title: "Account", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "support", extension: null, title: "Support", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "blog", extension: null, title: "News & analysis", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "p2p", extension: "p2p", title: "P2P trading", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: true, operationalSetting: null },
    { id: "staking", extension: "staking", title: "Staking", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: true, operationalSetting: null },
    { id: "ico", extension: "ico", title: "Token offerings", kycFeature: kyc_1.KYC_FEATURES.PURCHASE_ICO, blockedBySetting: "icoMaintenanceMode", requiresExtensions: [], requiresAttestation: true, operationalSetting: null },
    { id: "ecommerce", extension: "ecommerce", title: "Store", kycFeature: kyc_1.KYC_FEATURES.VIEW_ECOMMERCE, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "nft", extension: "nft", title: "NFT marketplace", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "futures", extension: "futures", title: "Futures", kycFeature: kyc_1.KYC_FEATURES.FUTURES_TRADING, blockedBySetting: null, requiresExtensions: ["ecosystem"], requiresAttestation: true, operationalSetting: null },
    { id: "ecosystem", extension: "ecosystem", title: "Ecosystem wallets", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: true, operationalSetting: null },
    { id: "copy-trading", extension: "copy_trading", title: "Copy trading", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: true, operationalSetting: null },
    { id: "faq", extension: "knowledge_base", title: "Help centre", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "ai-support", extension: "ai_support", title: "Support assistant", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
    { id: "hummingbot", extension: "hummingbot", title: "Bot console", kycFeature: null, blockedBySetting: null, requiresExtensions: [], requiresAttestation: false, operationalSetting: null },
];
exports.MODULE_BY_EXTENSION = new Map(exports.MOBILE_MODULES.filter((m) => m.extension !== null).map((m) => [m.extension, m]));
