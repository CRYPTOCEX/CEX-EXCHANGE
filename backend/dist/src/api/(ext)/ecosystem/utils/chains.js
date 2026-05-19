"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChainId = exports.chainConfigs = void 0;
exports.getTimestampInSeconds = getTimestampInSeconds;
exports.delay = delay;
const safe_imports_1 = require("@b/utils/safe-imports");
const transactions_1 = require("./transactions");
const utxo_1 = require("./utxo");
const error_1 = require("@b/utils/error");
function getTimestampInSeconds() {
    return Math.floor(Date.now() / 1000);
}
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.chainConfigs = {
    ETH: {
        name: "Ethereum",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("ETH", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.etherscan.io",
                chainId: 1,
            },
            sepolia: {
                explorer: "api-sepolia.etherscan.io",
                chainId: 11155111,
            },
        },
        currency: "ETH",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    BSC: {
        name: "Binance Smart Chain",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("BSC", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.bscscan.com",
                chainId: 56,
            },
            testnet: {
                explorer: "api-testnet.bscscan.com",
                chainId: 97,
            },
        },
        currency: "BNB",
        smartContract: {
            file: "ERC20",
            name: "BEP20",
        },
    },
    POLYGON: {
        name: "Polygon",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("POLYGON", address),
        cache: true,
        networks: {
            matic: {
                explorer: "api.polygonscan.com",
                chainId: 137,
            },
            amoy: {
                explorer: "api-amoy.polygonscan.com",
                chainId: 80002,
            },
        },
        currency: "MATIC",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    FTM: {
        name: "Fantom",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("FTM", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.ftmscan.com",
                chainId: 250,
            },
            testnet: {
                explorer: "api-testnet.ftmscan.com",
                chainId: 4002,
            },
        },
        currency: "FTM",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    OPTIMISM: {
        name: "Optimism",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("OPTIMISM", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api-optimistic.etherscan.io",
                chainId: 10,
            },
            sepolia: {
                explorer: "api-sepolia-optimistic.etherscan.io",
                chainId: 11155420,
            },
        },
        currency: "ETH",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    ARBITRUM: {
        name: "Arbitrum",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("ARBITRUM", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.arbiscan.io",
                chainId: 42161,
            },
            sepolia: {
                explorer: "api-sepolia.arbiscan.io",
                chainId: 421614,
            },
        },
        currency: "ETH",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    BASE: {
        name: "Base",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("BASE", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.basescan.org",
                chainId: 8453,
            },
            sepolia: {
                explorer: "api-sepolia.basescan.org",
                chainId: 84532,
            },
        },
        currency: "ETH",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    CELO: {
        name: "Celo",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("CELO", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.celoscan.io",
                chainId: 42220,
            },
            sepolia: {
                explorer: "api-sepolia.celoscan.io",
                chainId: 11142220,
            },
        },
        currency: "CELO",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    MO: {
        name: "MOCHAIN",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("MO", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "mainnet.mochain.app",
                chainId: 7860,
            },
            testnet: {
                explorer: "testnet.mochain.app",
                chainId: 7862,
            },
        },
        explorerApi: false,
        currency: "MO",
        smartContract: {
            file: "ERC20",
            name: "ERC20",
        },
    },
    TRON: {
        name: "Tron",
        decimals: 6,
        fetchFunction: (address) => (0, transactions_1.fetchPublicEcosystemTransactions)(`https://api.trongrid.io/v1/accounts/${address}/transactions?only_to=true&only_confirmed=true&limit=50&order_by=block_timestamp,asc`),
        cache: false,
        networks: {
            mainnet: {
                explorer: "api.trongrid.io",
            },
            shasta: {
                explorer: "api.shasta.trongrid.io",
            },
            nile: {
                explorer: "api.nileex.io",
            },
        },
        currency: "TRX",
    },
    RSK: {
        name: "RSK",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchPublicEcosystemTransactions)(`https://rootstock.blockscout.com/api/v2/addresses/${address}/transactions?filter=to%20%7C%20from`),
        cache: true,
        networks: {
            mainnet: {
                explorer: "rootstock.blockscout.com/api/v2",
                chainId: 30,
            },
            testnet: {
                explorer: "explorer.testnet.rootstock.io/api/v2",
                chainId: 31,
            },
        },
        currency: "RBTC",
        explorerApi: false,
    },
    HECO: {
        name: "Huobi ECO Chain",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("HECO", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.hecoinfo.com",
                chainId: 128,
            },
            testnet: {
                explorer: "api-testnet.hecoinfo.com",
                chainId: 256,
            },
        },
        currency: "HT",
        smartContract: {
            file: "ERC20",
            name: "HRC20",
        },
    },
    CRONOS: {
        name: "Cronos",
        decimals: 18,
        fetchFunction: (address) => (0, transactions_1.fetchGeneralEcosystemTransactions)("CRONOS", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "api.cronoscan.com",
                chainId: 25,
            },
        },
        currency: "CRON",
        smartContract: {
            file: "ERC20",
            name: "CRC20",
        },
    },
    BTC: {
        name: "Bitcoin",
        decimals: 8,
        fetchFunction: (address) => (0, utxo_1.fetchUTXOTransactions)("BTC", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "blockchain.info",
            },
        },
        currency: "BTC",
        confirmations: 3,
    },
    LTC: {
        name: "Litecoin",
        decimals: 8,
        fetchFunction: (address) => (0, utxo_1.fetchUTXOTransactions)("LTC", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "chain.so",
            },
        },
        currency: "LTC",
        confirmations: 6,
    },
    DOGE: {
        name: "Dogecoin",
        decimals: 8,
        fetchFunction: (address) => (0, utxo_1.fetchUTXOTransactions)("DOGE", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "chain.so",
            },
        },
        currency: "DOGE",
        confirmations: 6,
    },
    DASH: {
        name: "Dash",
        decimals: 8,
        fetchFunction: (address) => (0, utxo_1.fetchUTXOTransactions)("DASH", address),
        cache: true,
        networks: {
            mainnet: {
                explorer: "chain.so",
            },
        },
        currency: "DASH",
        confirmations: 6,
    },
    SOL: {
        name: "Solana",
        decimals: 9,
        fetchFunction: async (address) => {
            const SolanaService = await (0, safe_imports_1.getSolanaService)();
            const solanaService = await SolanaService.getInstance();
            return await solanaService.fetchTransactions(address);
        },
        cache: true,
        networks: {
            mainnet: {
                explorer: "https://explorer.solana.com",
            },
            testnet: {
                explorer: "https://explorer.solana.com?cluster=testnet",
            },
            devnet: {
                explorer: "https://explorer.solana.com?cluster=devnet",
            },
        },
        currency: "SOL",
        smartContract: {
            name: "SPL",
        },
    },
    XMR: {
        name: "Monero",
        decimals: 12,
        fetchFunction: async (address) => {
            throw (0, error_1.createError)({ statusCode: 501, message: "Monero not supported yet" });
        },
        cache: false,
        networks: {
            mainnet: {
                explorer: "https://xmrchain.net",
            },
        },
        currency: "XMR",
    },
    TON: {
        name: "TON",
        decimals: 9,
        fetchFunction: async (address) => {
            throw (0, error_1.createError)({ statusCode: 501, message: "TON not supported yet" });
        },
        cache: false,
        networks: {
            mainnet: {
                explorer: "https://tonscan.io",
            },
        },
        currency: "TON",
    },
};
const getChainId = async (provider) => {
    return (await provider.getNetwork()).chainId;
};
exports.getChainId = getChainId;
