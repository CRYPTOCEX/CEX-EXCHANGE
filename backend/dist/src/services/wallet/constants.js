"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIAL_CHAINS = exports.UTXO_CHAINS = exports.EVM_CHAINS = exports.WALLET_TYPE_CONFIG = exports.UTXO_TX_SIZE = exports.DUST_LIMITS = exports.CHAIN_CONFIG = exports.PRECISION_CONFIG = void 0;
exports.isEvmChain = isEvmChain;
exports.isUtxoChain = isUtxoChain;
exports.isSpecialChain = isSpecialChain;
exports.getChainConfig = getChainConfig;
exports.getPrecision = getPrecision;
exports.getDustLimit = getDustLimit;
exports.PRECISION_CONFIG = {
    USD: 2,
    EUR: 2,
    GBP: 2,
    JPY: 0,
    AUD: 2,
    CAD: 2,
    CHF: 2,
    CNY: 2,
    INR: 2,
    KRW: 0,
    RUB: 2,
    TRY: 2,
    BRL: 2,
    MXN: 2,
    ZAR: 2,
    BTC: 8,
    ETH: 8,
    LTC: 8,
    DOGE: 8,
    DASH: 8,
    SOL: 9,
    XMR: 12,
    TON: 9,
    TRX: 6,
    USDT: 6,
    USDC: 6,
    BUSD: 6,
    DAI: 18,
    TUSD: 6,
    USDP: 6,
    DEFAULT: 8,
};
exports.CHAIN_CONFIG = {
    ETH: {
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "ETH_NETWORK",
        explorerUrl: "https://etherscan.io",
    },
    BSC: {
        name: "BNB Smart Chain",
        symbol: "BNB",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "BSC_NETWORK",
        explorerUrl: "https://bscscan.com",
    },
    POLYGON: {
        name: "Polygon",
        symbol: "MATIC",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "POLYGON_NETWORK",
        explorerUrl: "https://polygonscan.com",
    },
    ARBITRUM: {
        name: "Arbitrum",
        symbol: "ETH",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "ARBITRUM_NETWORK",
        explorerUrl: "https://arbiscan.io",
    },
    OPTIMISM: {
        name: "Optimism",
        symbol: "ETH",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "OPTIMISM_NETWORK",
        explorerUrl: "https://optimistic.etherscan.io",
    },
    BASE: {
        name: "Base",
        symbol: "ETH",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "BASE_NETWORK",
        explorerUrl: "https://basescan.org",
    },
    AVAX: {
        name: "Avalanche",
        symbol: "AVAX",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "AVAX_NETWORK",
        explorerUrl: "https://snowtrace.io",
    },
    FTM: {
        name: "Fantom",
        symbol: "FTM",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "FTM_NETWORK",
        explorerUrl: "https://ftmscan.com",
    },
    LINEA: {
        name: "Linea",
        symbol: "ETH",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "LINEA_NETWORK",
        explorerUrl: "https://lineascan.build",
    },
    CELO: {
        name: "Celo",
        symbol: "CELO",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "CELO_NETWORK",
        explorerUrl: "https://celoscan.io",
    },
    BTC: {
        name: "Bitcoin",
        symbol: "BTC",
        decimals: 8,
        isEvm: false,
        isUtxo: true,
        networkEnvVar: "BTC_NETWORK",
        explorerUrl: "https://blockstream.info",
    },
    LTC: {
        name: "Litecoin",
        symbol: "LTC",
        decimals: 8,
        isEvm: false,
        isUtxo: true,
        networkEnvVar: "LTC_NETWORK",
        explorerUrl: "https://blockchair.com/litecoin",
    },
    DOGE: {
        name: "Dogecoin",
        symbol: "DOGE",
        decimals: 8,
        isEvm: false,
        isUtxo: true,
        networkEnvVar: "DOGE_NETWORK",
        explorerUrl: "https://blockchair.com/dogecoin",
    },
    DASH: {
        name: "Dash",
        symbol: "DASH",
        decimals: 8,
        isEvm: false,
        isUtxo: true,
        networkEnvVar: "DASH_NETWORK",
        explorerUrl: "https://blockchair.com/dash",
    },
    SOL: {
        name: "Solana",
        symbol: "SOL",
        decimals: 9,
        isEvm: false,
        isUtxo: false,
        networkEnvVar: "SOLANA_NETWORK",
        explorerUrl: "https://solscan.io",
    },
    TRON: {
        name: "Tron",
        symbol: "TRX",
        decimals: 6,
        isEvm: false,
        isUtxo: false,
        networkEnvVar: "TRON_NETWORK",
        explorerUrl: "https://tronscan.org",
    },
    XMR: {
        name: "Monero",
        symbol: "XMR",
        decimals: 12,
        isEvm: false,
        isUtxo: false,
        networkEnvVar: "MONERO_NETWORK",
        explorerUrl: "https://xmrchain.net",
    },
    TON: {
        name: "TON",
        symbol: "TON",
        decimals: 9,
        isEvm: false,
        isUtxo: false,
        networkEnvVar: "TON_NETWORK",
        explorerUrl: "https://tonscan.org",
    },
    MO: {
        name: "MO Chain",
        symbol: "MO",
        decimals: 18,
        isEvm: true,
        isUtxo: false,
        networkEnvVar: "MO_NETWORK",
    },
};
exports.DUST_LIMITS = {
    BTC: 0.00000546,
    LTC: 0.00001,
    DOGE: 1,
    DASH: 0.00001,
};
exports.UTXO_TX_SIZE = {
    BASE_TX: 10,
    INPUT_SIZE: 148,
    OUTPUT_SIZE: 34,
    P2WPKH_INPUT: 68,
    P2WPKH_OUTPUT: 31,
};
exports.WALLET_TYPE_CONFIG = {
    FIAT: {
        requiresAddress: false,
        requiresWalletData: false,
        requiresLedger: false,
        description: "Fiat currency wallet (USD, EUR, etc.)",
    },
    SPOT: {
        requiresAddress: false,
        requiresWalletData: false,
        requiresLedger: false,
        description: "Spot trading wallet (external exchange)",
    },
    ECO: {
        requiresAddress: true,
        requiresWalletData: true,
        requiresLedger: true,
        description: "Ecosystem wallet with blockchain addresses",
    },
    FUTURES: {
        requiresAddress: false,
        requiresWalletData: false,
        requiresLedger: false,
        description: "Futures trading wallet",
    },
    COPY_TRADING: {
        requiresAddress: false,
        requiresWalletData: false,
        requiresLedger: false,
        description: "Copy trading allocation wallet",
    },
};
exports.EVM_CHAINS = [
    "ETH",
    "BSC",
    "POLYGON",
    "ARBITRUM",
    "OPTIMISM",
    "BASE",
    "AVAX",
    "FTM",
    "LINEA",
    "CELO",
    "MO",
];
exports.UTXO_CHAINS = ["BTC", "LTC", "DOGE", "DASH"];
exports.SPECIAL_CHAINS = ["SOL", "TRON", "XMR", "TON"];
function isEvmChain(chain) {
    return exports.EVM_CHAINS.includes(chain);
}
function isUtxoChain(chain) {
    return exports.UTXO_CHAINS.includes(chain);
}
function isSpecialChain(chain) {
    return exports.SPECIAL_CHAINS.includes(chain);
}
function getChainConfig(chain) {
    return exports.CHAIN_CONFIG[chain];
}
function getPrecision(currency) {
    var _a;
    return (_a = exports.PRECISION_CONFIG[currency.toUpperCase()]) !== null && _a !== void 0 ? _a : exports.PRECISION_CONFIG.DEFAULT;
}
function getDustLimit(chain) {
    var _a;
    return (_a = exports.DUST_LIMITS[chain]) !== null && _a !== void 0 ? _a : 0.00001;
}
