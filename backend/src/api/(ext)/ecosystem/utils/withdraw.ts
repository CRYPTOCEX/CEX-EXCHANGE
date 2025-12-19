import { models } from "@b/db";
import { chainConfigs } from "./chains";
import { delay } from "@b/utils";
import { logger } from "@b/utils/console";
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
  logger.info("EVM_WITHDRAW", `Starting withdrawal: txId=${id}, wallet=${walletId}, chain=${chain}, amount=${amount}, to=${toAddress?.substring(0, 10)}...`);

  validateAddress(toAddress, chain);
  logger.debug("EVM_WITHDRAW", "Address validation passed");

  logger.debug("EVM_WITHDRAW", `Initializing provider for chain: ${chain}`);
  const provider = await initializeProvider(chain);

  logger.debug("EVM_WITHDRAW", `Fetching user wallet: ${walletId}`);
  const userWallet = await models.wallet.findByPk(walletId);
  if (!userWallet) {
    logger.error("EVM_WITHDRAW", `User wallet not found: ${walletId}`);
    throw new Error("User wallet not found");
  }
  logger.debug("EVM_WITHDRAW", `Wallet found, currency: ${userWallet.currency}`);

  const { currency } = userWallet;

  logger.debug("EVM_WITHDRAW", `Initializing contracts for ${currency} on ${chain}`);
  const { contract, contractAddress, gasPayer, contractType, tokenDecimals } =
    await initializeContracts(chain, currency, provider);

  logger.debug("EVM_WITHDRAW", `Contract details: type=${contractType}, address=${contractAddress}, decimals=${tokenDecimals}`);

  const amountEth = ethers.parseUnits(amount.toString(), tokenDecimals);
  logger.debug("EVM_WITHDRAW", `Amount in wei: ${amountEth.toString()}`);

  let walletData,
    actualTokenOwner,
    alternativeWalletUsed,
    transaction,
    alternativeWallet;
  if (contractType === "PERMIT") {
    logger.debug("EVM_WITHDRAW", "Processing PERMIT contract type");
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
      logger.error("EVM_WITHDRAW", "Failed to execute permit", error);
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
      logger.error("EVM_WITHDRAW", `Failed to execute withdrawal: ${error.message}`);
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
      logger.error("EVM_WITHDRAW", `Failed to execute withdrawal: ${error.message}`);
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
      logger.error("EVM_WITHDRAW", `Failed to execute withdrawal: ${error.message}`);
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
          logger.success("EVM_WITHDRAW", `Transaction confirmed: ${transaction.hash}`);

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
          } else if (contractType === "NATIVE") {
            // For NATIVE tokens, reconcile the gas fee difference
            // The database was debited with: amount + estimatedGasFee
            // On-chain was debited with: amount + actualGasFee
            // We need to refund/deduct the difference
            try {
              // Get the full transaction details to access gas price
              const tx = await provider.getTransaction(transaction.hash);
              const gasPrice = tx?.gasPrice || ethers.parseUnits("0", "gwei");
              const actualGasUsed = txReceipt.gasUsed * gasPrice;
              const actualGasFee = parseFloat(ethers.formatUnits(actualGasUsed, tokenDecimals));

              logger.debug("EVM_WITHDRAW", `NATIVE gas reconciliation: gasUsed=${txReceipt.gasUsed}, gasPrice=${gasPrice}, actualGasFee=${actualGasFee}, txHash=${transaction.hash}`);

              // Get the transaction record to find the estimated fee
              const txRecord = await models.transaction.findByPk(id);
              if (txRecord && txRecord.fee) {
                const estimatedGasFee = parseFloat(txRecord.fee);
                const gasDifference = estimatedGasFee - actualGasFee;

                logger.debug("EVM_WITHDRAW", `Gas fee comparison: estimated=${estimatedGasFee}, actual=${actualGasFee}, difference=${gasDifference}`);

                // If there's a significant difference, adjust the wallet balance
                if (Math.abs(gasDifference) > 0.00000001) {
                  const wallet = await models.wallet.findByPk(walletId);
                  if (wallet) {
                    const addresses = JSON.parse(wallet.address as any);
                    const chainBalance = addresses[chain]?.balance || 0;

                    // Refund if we overestimated, deduct if we underestimated
                    const newChainBalance = parseFloat((chainBalance + gasDifference).toFixed(tokenDecimals));
                    const newWalletBalance = parseFloat((wallet.balance + gasDifference).toFixed(tokenDecimals));

                    addresses[chain].balance = newChainBalance;

                    await models.wallet.update(
                      {
                        balance: newWalletBalance,
                        address: JSON.stringify(addresses)
                      },
                      {
                        where: { id: walletId }
                      }
                    );

                    logger.info("EVM_WITHDRAW", `Adjusted wallet balance by ${gasDifference} ${currency}`);
                  }
                }
              }
            } catch (gasError) {
              logger.error("EVM_WITHDRAW", "Failed to reconcile gas fee", gasError);
              // Don't fail the withdrawal if reconciliation fails
            }
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
          logger.success("EVM_WITHDRAW", "Transaction marked as COMPLETED");
          return true;
        } else {
          attempts += 1;
          await delay(5000);
        }
      } catch (error) {
        logger.error("EVM_WITHDRAW", `Failed to check transaction status: ${error.message}`);

        // Inform admin about withdrawal issue
        try {
          await models.notification.create({
            userId: "system", // System notification for admins
            type: "alert",
            title: "Ecosystem Withdrawal Issue",
            message: `Failed to check withdrawal transaction status: ${transaction.hash}. Error: ${error.message}`,
            link: `/admin/ecosystem/wallet/custodial`,
            read: false,
          });

          // Also notify all admin users
          const admins = await models.user.findAll({
            include: [{
              model: models.role,
              as: "role",
              where: {
                name: ["Admin", "Super Admin"],
              },
            }],
            attributes: ["id"],
          });

          const adminNotifications = admins.map(admin => ({
            userId: admin.id,
            type: "alert",
            title: "Ecosystem Withdrawal Issue",
            message: `Failed to verify withdrawal transaction ${transaction.hash}. Manual review required.`,
            link: `/admin/ecosystem/wallet/custodial`,
            read: false,
          }));

          if (adminNotifications.length > 0) {
            await models.notification.bulkCreate(adminNotifications);
          }
        } catch (notifError) {
          logger.error("EVM_WITHDRAW", "Failed to send admin notification", notifError);
        }

        attempts += 1;
        await delay(5000);
      }
    }

    // If loop exits, mark transaction as failed
    logger.error("EVM_WITHDRAW", `Transaction ${transaction.hash} failed after ${maxAttempts} attempts.`);
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
