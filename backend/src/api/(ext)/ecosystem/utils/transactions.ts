import { differenceInMinutes } from "date-fns";
import { chainConfigs } from "./chains";
import { fetchUTXOTransactions } from "./utxo";
import { RedisSingleton } from "../../../../utils/redis";
import { logError } from "@b/utils/logger";
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
    logError("fetch_ecosystem_transactions", error, __filename);
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
    console.error('[TX_PARSE_ERROR] Invalid raw transactions format received:', {
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
  const apiEnvVar = `${chain}_EXPLORER_API_KEY`;
  const apiKey = process.env[apiEnvVar];

  if (hasExplorerApi && !apiKey) {
    throw new Error(`Environment variable ${apiEnvVar} is not set`);
  }

  const network = chainConfig.networks[networkName];

  if (!network || !network.explorer) {
    throw new Error(
      `Unsupported or misconfigured network: ${networkName} for chain: ${chain}`
    );
  }
  // Use Etherscan V2 API endpoint with chainid parameter
  const chainIdParam = network.chainId ? `&chainid=${network.chainId}` : "";
  const url = `https://${network.explorer}/v2/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc${chainIdParam}${
    hasExplorerApi ? `&apikey=${apiKey}` : ""
  }`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Handle API errors
    if (data.status === "0" && data.message === "NOTOK") {
      console.error(`[ETHERSCAN_API_ERROR] ${chain}: ${data.result}`);
      // Return empty result set for addresses with no transactions
      return { status: "1", message: "OK", result: [] };
    }

    return data;
  } catch (error) {
    logError("fetch_general_ecosystem_transactions", error, __filename);
    throw new Error(`API call failed: ${error.message}`);
  }
};

export const fetchPublicEcosystemTransactions = async (url: string) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    logError("fetch_public_ecosystem_transactions", error, __filename);
    throw new Error(`API call failed: ${error.message}`);
  }
};
