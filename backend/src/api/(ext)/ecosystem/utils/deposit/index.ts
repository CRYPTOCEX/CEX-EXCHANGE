// Add these imports if needed at the top of your file where monitorDeposits will reside
import { models } from "@b/db";
import { getEcosystemToken } from "@b/api/(ext)/ecosystem/utils/tokens";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";
import { storeAndBroadcastTransaction } from "@b/api/(ext)/ecosystem/utils/redis/deposit";
import { handleEcosystemDeposit } from "@b/api/(ext)/ecosystem/utils/wallet";
import { hasClients, messageBroker } from "@b/handler/Websocket";

const ENABLE_MONITORING = process.env.ENABLE_DEPOSIT_MONITORING === "true";
const EVM_CHECK_INTERVAL = Number(process.env.EVM_CHECK_INTERVAL_MS) || 300000; // 5 min default
const UTXO_CHECK_INTERVAL =
  Number(process.env.UTXO_CHECK_INTERVAL_MS) || 900000; // 15 min default
const API_THRESHOLD = Number(process.env.API_THRESHOLD) || 100;

// Track API usage for each chain to avoid exceeding limits
const apiUsageCount: Record<string, number> = {};

// Helper to check if we can call external APIs for a chain
async function canUseAPI(chain: string): Promise<boolean> {
  const config = chainConfigs[chain];
  // If chain does not rely on explorerApi or we have no reason to limit, return true
  if (!config?.explorerApi) return true;

  if (!apiUsageCount[chain]) apiUsageCount[chain] = 0;
  if (apiUsageCount[chain] >= API_THRESHOLD) {
    console.warn(`API limit reached for ${chain}, skipping this cycle.`);
    return false;
  }
  apiUsageCount[chain] += 1;
  return true;
}

// Determine chain type: EVM or not
function isEVMChain(chain: string): boolean {
  // Based on your chainConfigs, EVM chains typically have smartContract fields or are known.
  return !!chainConfigs[chain]?.smartContract;
}

// Core monitoring function
export async function monitorDeposits() {
  if (!ENABLE_MONITORING) {
    console.log("Deposit monitoring disabled.");
    return;
  }

  console.log("Deposit monitoring enabled. Starting up...");

  // Fetch all ECO wallets
  const wallets = await models.wallet.findAll({
    where: { type: "ECO" },
    attributes: ["id", "currency", "address"],
  });

  // Group addresses by chain
  const chainAddresses: Record<
    string,
    {
      walletId: number;
      address: string;
      currency: string;
      contractType: string;
    }[]
  > = {};

  for (const wallet of wallets) {
    if (!wallet.address) continue;
    const addresses =
      typeof wallet.address === "string"
        ? JSON.parse(wallet.address)
        : wallet.address;
    const currency = wallet.currency;
    for (const chain in addresses) {
      let token;
      try {
        token = await getEcosystemToken(chain, currency);
      } catch {
        continue; // Skip if token not found
      }
      const contractType = token.contractType;
      const addr =
        addresses[chain]?.address || addresses[chain]?.addr || addresses[chain];
      if (!addr) continue;

      if (!chainAddresses[chain]) chainAddresses[chain] = [];
      chainAddresses[chain].push({
        walletId: wallet.id,
        address: contractType === "NO_PERMIT" ? addr : addr,
        currency,
        contractType,
      });
    }
  }

  // EVM chains every EVM_CHECK_INTERVAL
  const evmChains = Object.keys(chainAddresses).filter(isEVMChain);
  if (evmChains.length > 0) {
    setInterval(async () => {
      for (const chain of evmChains) {
        if (!(await canUseAPI(chain))) continue;
        await checkDepositsForChain(chain, chainAddresses[chain]);
      }
    }, EVM_CHECK_INTERVAL);
  }

  // Non-EVM chains (e.g., UTXO, SOL, TRON, etc.) every UTXO_CHECK_INTERVAL
  const nonEVMChains = Object.keys(chainAddresses).filter(
    (c) => !isEVMChain(c)
  );
  if (nonEVMChains.length > 0) {
    setInterval(async () => {
      for (const chain of nonEVMChains) {
        if (!(await canUseAPI(chain))) continue;
        await checkDepositsForChain(chain, chainAddresses[chain]);
      }
    }, UTXO_CHECK_INTERVAL);
  }
}

// Generic function to check deposits for a given chain and its addresses
async function checkDepositsForChain(
  chain: string,
  addressesData: {
    walletId: number;
    address: string;
    currency: string;
    contractType: string;
  }[]
) {
  const config = chainConfigs[chain];
  if (!config || !config.fetchFunction) {
    console.warn(`No fetch function for chain: ${chain}`);
    return;
  }

  // For each address, fetch recent transactions and process
  for (const data of addressesData) {
    let transactions;
    try {
      // Use the chain's configured fetchFunction to get transactions
      transactions = await config.fetchFunction(data.address);
      if (!Array.isArray(transactions)) continue;

      // Filter and handle new deposits:
      for (const tx of transactions) {
        // You can determine if it's a deposit by checking if tx.to matches data.address or similar logic
        if (
          tx.to &&
          tx.to.toLowerCase() === data.address.toLowerCase() &&
          tx.status === "CONFIRMED"
        ) {
          // Create txDetails based on tx and store/broadcast as you do in your original watchDeposits logic
          await storeAndBroadcastTransaction(tx, tx.hash);

          // Handle deposit completion
          try {
            const response = await handleEcosystemDeposit({
              ...tx,
              id: data.walletId,
              chain: chain,
              contractType: data.contractType,
            });

            // Send websocket notification
            if (response?.transaction && hasClients(`/api/ecosystem/deposit`)) {
              messageBroker.broadcastToSubscribedClients(
                "/api/ecosystem/deposit",
                {
                  currency: response.wallet?.currency,
                  chain: chain,
                  address: data.address,
                },
                {
                  stream: "verification",
                  data: {
                    status: 200,
                    message: "Transaction completed",
                    ...response,
                    trx: tx,
                    balance: response.wallet?.balance,
                    currency: response.wallet?.currency,
                    chain: chain,
                    method: "Wallet Deposit",
                  },
                }
              );
            }
          } catch (error) {
            console.error(
              `Error handling deposit for ${tx.hash}: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `Error fetching transactions for chain ${chain}, address ${data.address}: ${error.message}`
      );
    }
  }
}
