import { models } from "@b/db";
import { chainConfigs } from "./chains";
import { delay } from "@b/utils";
import {
  executeEcosystemWithdrawal,
  executeNativeWithdrawal,
  executeNoPermitWithdrawal,
  executePermit,
  getAndValidateNativeTokenOwner,
  getAndValidateTokenOwner,
  getWalletData,
  initializeContracts,
  updateAlternativeWallet,
  validateAddress,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import { initializeProvider } from "./provider";
import { ethers } from "ethers";

export const handleEvmWithdrawal = async (
  id: string,
  walletId: string,
  chain: string,
  amount: number,
  toAddress: string
): Promise<boolean> => {
  console.log(`[EVM_WITHDRAW] Starting EVM withdrawal:`, {
    transactionId: id,
    walletId,
    chain,
    amount,
    toAddress: toAddress?.substring(0, 10) + '...'
  });

  validateAddress(toAddress, chain);
  console.log(`[EVM_WITHDRAW] Address validation passed`);

  console.log(`[EVM_WITHDRAW] Initializing provider for chain: ${chain}`);
  const provider = await initializeProvider(chain);

  console.log(`[EVM_WITHDRAW] Fetching user wallet: ${walletId}`);
  const userWallet = await models.wallet.findByPk(walletId);
  if (!userWallet) {
    console.error(`[EVM_WITHDRAW] User wallet not found: ${walletId}`);
    throw new Error("User wallet not found");
  }
  console.log(`[EVM_WITHDRAW] Wallet found, currency: ${userWallet.currency}`);

  const { currency } = userWallet;

  console.log(`[EVM_WITHDRAW] Initializing contracts for ${currency} on ${chain}`);
  const { contract, contractAddress, gasPayer, contractType, tokenDecimals } =
    await initializeContracts(chain, currency, provider);

  console.log(`[EVM_WITHDRAW] Contract details:`, {
    contractType,
    contractAddress,
    tokenDecimals
  });

  const amountEth = ethers.parseUnits(amount.toString(), tokenDecimals);
  console.log(`[EVM_WITHDRAW] Amount in wei: ${amountEth.toString()}`);

  let walletData,
    actualTokenOwner,
    alternativeWalletUsed,
    transaction,
    alternativeWallet;
  if (contractType === "PERMIT") {
    console.log(`[EVM_WITHDRAW] Processing PERMIT contract type`);
    walletData = await getWalletData(walletId, chain);
    const ownerData = await getAndValidateTokenOwner(
      walletData,
      amountEth,
      contract,
      provider
    );
    actualTokenOwner = ownerData.actualTokenOwner;
    alternativeWalletUsed = ownerData.alternativeWalletUsed;
    alternativeWallet = ownerData.alternativeWallet;

    try {
      await executePermit(
        contract,
        contractAddress,
        gasPayer,
        actualTokenOwner,
        amountEth,
        provider
      );
    } catch (error) {
      console.error(`[EVM_WITHDRAW] Failed to execute permit:`, error);
      throw new Error(`Failed to execute permit: ${error.message}`);
    }

    try {
      transaction = await executeEcosystemWithdrawal(
        contract,
        contractAddress,
        gasPayer,
        actualTokenOwner,
        toAddress,
        amountEth,
        provider
      );
    } catch (error) {
      console.error(`Failed to execute withdrawal: ${error.message}`);
      throw new Error(`Failed to execute withdrawal: ${error.message}`);
    }
  } else if (contractType === "NO_PERMIT") {
    const isNative = chainConfigs[chain].currency === currency;
    try {
      transaction = await executeNoPermitWithdrawal(
        chain,
        contractAddress,
        gasPayer,
        toAddress,
        amountEth,
        provider,
        isNative
      );
    } catch (error) {
      console.error(`Failed to execute withdrawal: ${error.message}`);
      throw new Error(`Failed to execute withdrawal: ${error.message}`);
    }
  } else if (contractType === "NATIVE") {
    try {
      walletData = await getWalletData(walletId, chain);
      const payer = await getAndValidateNativeTokenOwner(
        walletData,
        amountEth,
        provider
      );
      transaction = await executeNativeWithdrawal(
        payer,
        toAddress,
        amountEth,
        provider
      );
    } catch (error) {
      console.error(`Failed to execute withdrawal: ${error.message}`);
      throw new Error(`Failed to execute withdrawal: ${error.message}`);
    }
  }

  if (transaction && transaction.hash) {
    // Checking the transaction status
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      try {
        const txReceipt = await provider.getTransactionReceipt(
          transaction.hash
        );
        if (txReceipt && txReceipt.status === 1) {
          if (contractType === "PERMIT") {
            if (alternativeWalletUsed) {
              await updateAlternativeWallet(currency, chain, amount);

              // Deduct from the wallet that was used for withdrawal
              await updatePrivateLedger(
                alternativeWallet.walletId,
                alternativeWallet.index,
                currency,
                chain,
                amount
              );
            }

            // Add to the wallet that initiated the withdrawal
            await updatePrivateLedger(
              walletId,
              walletData.index,
              currency,
              chain,
              -amount
            );
          }

          await models.transaction.update(
            {
              status: "COMPLETED",
              description: `Withdrawal of ${amount} ${currency} to ${toAddress}`,
              trxId: transaction.hash,
            },
            {
              where: { id },
            }
          );
          return true;
        } else {
          attempts += 1;
          await delay(5000);
        }
      } catch (error) {
        console.error(`Failed to check transaction status: ${error.message}`);
        // TODO: Inform admin about this
        attempts += 1;
        await delay(5000);
      }
    }

    // If loop exits, mark transaction as failed
    console.error(
      `Transaction ${transaction.hash} failed after ${maxAttempts} attempts.`
    );
  }

  throw new Error("Transaction failed");
};

export async function updatePrivateLedger(
  walletId: string,
  index: number,
  currency: string,
  chain: string,
  amount: number
): Promise<void> {
  // Fetch or create the ledger entry
  const ledger = await getPrivateLedger(walletId, index, currency, chain);

  // Update the offchainDifference
  const newOffchainDifference = (ledger?.offchainDifference ?? 0) + amount;

  const networkEnvVar = `${chain}_NETWORK`;
  const network = process.env[networkEnvVar];

  const existingLedger = await models.ecosystemPrivateLedger.findOne({
    where: {
      walletId,
      index,
      currency,
      chain,
      network,
    },
  });

  if (existingLedger) {
    await models.ecosystemPrivateLedger.update(
      {
        offchainDifference: newOffchainDifference,
      },
      {
        where: {
          walletId,
          index,
          currency,
          chain,
          network,
        },
      }
    );
  } else {
    await models.ecosystemPrivateLedger.create({
      walletId,
      index,
      currency,
      chain,
      offchainDifference: newOffchainDifference,
      network,
    });
  }
}

async function getPrivateLedger(
  walletId: string,
  index: number,
  currency: string,
  chain: string
): Promise<EcosystemPrivateLedger> {
  // If not found, create a new ledger entry
  const networkEnvVar = `${chain}_NETWORK`;
  const network = process.env[networkEnvVar];

  // Try to find the existing ledger entry
  return (await models.ecosystemPrivateLedger.findOne({
    where: {
      walletId,
      index,
      currency,
      chain,
      network,
    },
  })) as unknown as EcosystemPrivateLedger;
}

async function normalizePrivateLedger(walletId: number): Promise<void> {
  // Fetch all ledger entries for this wallet
  const ledgers: EcosystemPrivateLedger[] =
    await getAllPrivateLedgersForWallet(walletId);

  let positiveDifferences: EcosystemPrivateLedger[] = [];
  let negativeDifferences: EcosystemPrivateLedger[] = [];

  // Separate ledgers with positive and negative offchainDifference
  for (const ledger of ledgers) {
    if (ledger.offchainDifference > 0) {
      positiveDifferences.push(ledger);
    } else if (ledger.offchainDifference < 0) {
      negativeDifferences.push(ledger);
    }
  }

  // Sort the ledgers to optimize the normalization process
  positiveDifferences = positiveDifferences.sort(
    (a, b) => b.offchainDifference - a.offchainDifference
  );
  negativeDifferences = negativeDifferences.sort(
    (a, b) => a.offchainDifference - b.offchainDifference
  );

  // Normalize
  for (const posLedger of positiveDifferences) {
    for (const negLedger of negativeDifferences) {
      const amountToNormalize = Math.min(
        posLedger.offchainDifference,
        -negLedger.offchainDifference
      );

      if (amountToNormalize === 0) {
        continue;
      }

      // Update the ledgers
      await models.ecosystemPrivateLedger.update(
        {
          offchainDifference: posLedger.offchainDifference - amountToNormalize,
        },
        {
          where: { id: posLedger.id },
        }
      );

      await models.ecosystemPrivateLedger.update(
        {
          offchainDifference: negLedger.offchainDifference + amountToNormalize,
        },
        {
          where: { id: negLedger.id },
        }
      );

      // Update the in-memory objects to reflect the changes
      posLedger.offchainDifference -= amountToNormalize;
      negLedger.offchainDifference += amountToNormalize;

      // If one of the ledgers has been fully normalized, break out of the loop
      if (
        posLedger.offchainDifference === 0 ||
        negLedger.offchainDifference === 0
      ) {
        break;
      }
    }
  }
}

async function getAllPrivateLedgersForWallet(
  walletId: number
): Promise<EcosystemPrivateLedger[]> {
  // Fetch all ledger entries for the given wallet ID
  return await models.ecosystemPrivateLedger.findAll({
    where: {
      walletId,
    },
  });
}
