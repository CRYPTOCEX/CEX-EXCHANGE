import { getSolanaService } from "@b/utils/safe-imports";
import {
  fetchGeneralEcosystemTransactions,
  fetchPublicEcosystemTransactions,
} from "./transactions";
import { fetchUTXOTransactions } from "./utxo";

type FetchFunction = (address: string) => Promise<any>;

interface ChainConfig {
  name: string;
  decimals: number;
  fetchFunction: FetchFunction;
  cache: boolean;
  networks: Record<string, Network>;
  currency: string;
  smartContract?: SmartContract;
  explorerApi?: boolean;
  confirmations?: number;
}

interface Network {
  explorer: string;
  chainId?: number; // Required for Etherscan V2 API
}

interface SmartContract {
  file?: string;
  name: string;
}

export function getTimestampInSeconds() {
  return Math.floor(Date.now() / 1000);
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ChainSymbol =
  | "ETH"
  | "BSC"
  | "POLYGON"
  | "FTM"
  | "OPTIMISM"
  | "TRON"
  | "ARBITRUM"
  | "BASE"
  | "CELO"
  | "RSK"
  | "SOL";

export const chainConfigs: Record<string, ChainConfig> = {
  ETH: {
    name: "Ethereum",
    decimals: 18,
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("ETH", address),
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("BSC", address),
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("POLYGON", address),
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("FTM", address),
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("OPTIMISM", address),
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("ARBITRUM", address),
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("BASE", address),
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("CELO", address),
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
  // MO (EVM) - Custom chain, not supported by Etherscan V2 API
  MO: {
    name: "MOCHAIN",
    decimals: 18,
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("MO", address),
    cache: true,
    networks: {
      mainnet: {
        explorer: "mainnet.mochain.app",
        chainId: 7860, // MOCHAIN mainnet
      },
      testnet: {
        explorer: "testnet.mochain.app",
        chainId: 7862, // MOCHAIN testnet
      },
    },
    explorerApi: false, // Uses custom explorer, not Etherscan API
    currency: "MO",
    smartContract: {
      file: "ERC20",
      name: "ERC20",
    },
  },

  TRON: {
    name: "Tron",
    decimals: 6,
    fetchFunction: (address: string) =>
      fetchPublicEcosystemTransactions(
        `https://api.trongrid.io/v1/accounts/${address}/transactions?only_to=true&only_confirmed=true&limit=50&order_by=block_timestamp,asc`
      ),
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
  // RSK uses Blockscout API, not Etherscan V2
  RSK: {
    name: "RSK",
    decimals: 18,
    fetchFunction: (address: string) =>
      fetchPublicEcosystemTransactions(
        `https://rootstock.blockscout.com/api/v2/addresses/${address}/transactions?filter=to%20%7C%20from`
      ),
    cache: true,
    networks: {
      mainnet: {
        explorer: "rootstock.blockscout.com/api/v2",
        chainId: 30, // RSK mainnet
      },
      testnet: {
        explorer: "explorer.testnet.rootstock.io/api/v2",
        chainId: 31, // RSK testnet
      },
    },
    currency: "RBTC",
    explorerApi: false, // Uses Blockscout API, not Etherscan
  },
  HECO: {
    name: "Huobi ECO Chain",
    decimals: 18,
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("HECO", address),
    cache: true,
    networks: {
      mainnet: {
        explorer: "api.hecoinfo.com",
        chainId: 128, // HECO mainnet
      },
      testnet: {
        explorer: "api-testnet.hecoinfo.com",
        chainId: 256, // HECO testnet
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
    fetchFunction: (address: string) =>
      fetchGeneralEcosystemTransactions("CRONOS", address),
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
    fetchFunction: (address: string) => fetchUTXOTransactions("BTC", address),
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
    fetchFunction: (address: string) => fetchUTXOTransactions("LTC", address),
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
    fetchFunction: (address: string) => fetchUTXOTransactions("DOGE", address),
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
    fetchFunction: (address: string) => fetchUTXOTransactions("DASH", address),
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
    fetchFunction: async (address: string) => {
      const SolanaService = await getSolanaService();
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
    fetchFunction: async (address: string) => {
      throw new Error("Monero not supported yet");
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
    fetchFunction: async (address: string) => {
      throw new Error("TON not supported yet");
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

// Get chain ID
export const getChainId = async (provider) => {
  return (await provider.getNetwork()).chainId;
};
