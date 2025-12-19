import { differenceInMinutes } from "date-fns";
import { chainConfigs } from "./chains";
import { fetchUTXOTransactions } from "./utxo";
import { RedisSingleton } from "../../../../utils/redis";
import { logger } from "@b/utils/console";
import { getSolanaService, getTronService, getMoneroService, getTonService } from "@b/utils/safe-imports";

const CACHE_EXPIRATION = 30;

type ParsedTransaction = {
  timestamp: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  method: string;
  methodId: string;
  contract: string;
  confirmations: string;
  status: string;
  isError: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
};

export const fetchEcosystemTransactions = async (
  chain: string,
  address: string
) => {
  const config = chainConfigs[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  try {
    if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
      return await fetchUTXOTransactions(chain, address);
    } else if (chain === "SOL") {
      const SolanaService = await getSolanaService();
      const solanaService = await SolanaService.getInstance();
      return await solanaService.fetchTransactions(address);
    } else if (chain === "TRON") {
      const TronService = await getTronService();
      const tronService = await TronService.getInstance();
      return await tronService.fetchTransactions(address);
    } else if (chain === "XMR") {
      const MoneroService = await getMoneroService();
      const moneroService = await MoneroService.getInstance();
      return await moneroService.fetchTransactions("master_wallet");
    } else if (chain === "TON") {
      const TonService = await getTonService();
      const tonService = await TonService.getInstance();
      return await tonService.fetchTransactions(address);
    } else {
      return await fetchAndParseTransactions(address, chain, config);
    }
  } catch (error) {
    logger.error("ECOSYSTEM_TRANSACTIONS", "Failed to fetch ecosystem transactions", error);
    throw new Error(error.message);
  }
};

const fetchAndParseTransactions = async (
  address: string,
  chain: string,
  config: any
) => {
  const cacheKey = `wallet:${address}:transactions:${chain.toLowerCase()}`;
  if (config.cache) {
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  const rawTransactions = await config.fetchFunction(address, chain);
  const parsedTransactions = parseRawTransactions(rawTransactions);

  if (config.cache) {
    const cacheData = {
      transactions: parsedTransactions,
      timestamp: new Date().toISOString(),
    };
    const redis = RedisSingleton.getInstance();
    await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(cacheData));
  }

  return parsedTransactions;
};

const getCachedData = async (cacheKey: string) => {
  const redis = RedisSingleton.getInstance();
  let cachedData: any = await redis.get(cacheKey);
  if (cachedData && typeof cachedData === "string") {
    cachedData = JSON.parse(cachedData);
  }
  if (cachedData) {
    const now = new Date();
    const lastUpdated = new Date(cachedData.timestamp);
    if (differenceInMinutes(now, lastUpdated) < CACHE_EXPIRATION) {
      return cachedData.transactions;
    }
  }
  return null;
};

const parseRawTransactions = (rawTransactions: any): ParsedTransaction[] => {
  if (!Array.isArray(rawTransactions?.result)) {
    logger.error("TRANSACTIONS", "Invalid raw transactions format received", {
      type: typeof rawTransactions,
      isArray: Array.isArray(rawTransactions),
      hasResult: rawTransactions?.hasOwnProperty('result'),
      resultType: typeof rawTransactions?.result,
      keys: rawTransactions ? Object.keys(rawTransactions) : 'null',
      sample: JSON.stringify(rawTransactions).substring(0, 500)
    });
    throw new Error(`Invalid raw transactions format: expected {result: array}, got ${typeof rawTransactions}`);
  }

  return rawTransactions.result.map((rawTx: any) => {
    return {
      timestamp: rawTx.timeStamp,
      hash: rawTx.hash,
      from: rawTx.from,
      to: rawTx.to,
      amount: rawTx.value,
      method: rawTx.functionName,
      methodId: rawTx.methodId,
      contract: rawTx.contractAddress,
      confirmations: rawTx.confirmations,
      status: rawTx.txreceipt_status,
      isError: rawTx.isError,
      gas: rawTx.gas,
      gasPrice: rawTx.gasPrice,
      gasUsed: rawTx.gasUsed,
    };
  });
};

export const fetchGeneralEcosystemTransactions = async (
  chain: string,
  address: string
) => {
  const chainConfig = chainConfigs[chain];

  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const networkEnvVar = `${chain}_NETWORK`;
  const networkName = process.env[networkEnvVar];

  if (!networkName) {
    throw new Error(`Environment variable ${networkEnvVar} is not set`);
  }

  const hasExplorerApi = chainConfig.explorerApi ?? true;

  // V2 API uses a single Etherscan API key for all chains
  // Fallback to chain-specific key for backward compatibility
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env[`${chain}_EXPLORER_API_KEY`];

  if (hasExplorerApi && !apiKey) {
    throw new Error(`Environment variable ETHERSCAN_API_KEY or ${chain}_EXPLORER_API_KEY is not set`);
  }

  const network = chainConfig.networks[networkName];

  if (!network || !network.chainId) {
    throw new Error(
      `Unsupported or misconfigured network: ${networkName} for chain: ${chain}. ChainId is required for V2 API.`
    );
  }

  // Use unified Etherscan V2 API endpoint for all chains
  // According to migration guide: https://api.etherscan.io/v2/api?chainid={chainId}
  const url = `https://api.etherscan.io/v2/api?chainid=${network.chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc${
    hasExplorerApi ? `&apikey=${apiKey}` : ""
  }`;

  try {
    logger.info("ETHERSCAN", `${chain} Fetching transactions for address ${address.substring(0, 10)}... using chainId ${network.chainId}`);

    const response = await fetch(url);

    // Check HTTP status code
    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error';
      const text = await response.text();
      throw new Error(`HTTP ${response.status} ${statusText}: ${text.substring(0, 200)}`);
    }

    const contentType = response.headers.get("content-type");

    // Check if response is HTML (error page)
    if (contentType && contentType.includes("text/html")) {
      const text = await response.text();
      throw new Error(`Received HTML instead of JSON. API might be down or rate limited. Response: ${text.substring(0, 200)}`);
    }

    const data = await response.json();

    // Handle API errors
    if (data.status === "0") {
      if (data.message === "NOTOK") {
        logger.warn("ETHERSCAN", `${chain} API error: ${data.result}`);
        // Return empty result set for addresses with no transactions or errors
        return { status: "1", message: "OK", result: [] };
      }
    }

    // Validate we got proper data structure
    if (!data.result || !Array.isArray(data.result)) {
      logger.warn("ETHERSCAN", `${chain} Unexpected response format, returning empty results`);
      return { status: "1", message: "OK", result: [] };
    }

    logger.info("ETHERSCAN", `${chain} Successfully fetched ${data.result.length} transactions`);
    return data;
  } catch (error) {
    logger.error("GENERAL_TRANSACTIONS", "API call failed", error);
    throw new Error(`API call failed: ${error.message}`);
  }
};

export const fetchPublicEcosystemTransactions = async (url: string) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    logger.error("PUBLIC_TRANSACTIONS", "API call failed", error);
    throw new Error(`API call failed: ${error.message}`);
  }
};
