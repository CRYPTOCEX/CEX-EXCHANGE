import { models, sequelize } from "@b/db";
import { Transaction } from "sequelize";
import { createError } from "@b/utils/error";
import { decrypt, encrypt } from "@b/utils/encrypt";
import { 
  getSolanaService, 
  getTronService, 
  getMoneroService, 
  getTonService, 
  isServiceAvailable 
} from "@b/utils/safe-imports";
import { ethers } from "ethers";
import TonWeb from "tonweb";
import { fromBigInt } from "./blockchain";
import { estimateGas, getAdjustedGasPrice } from "./gas";
import { getTokenContractAddress } from "./tokens";
import { getSmartContract } from "./smartContract";
import { getChainId, getTimestampInSeconds } from "./chains";
import { Op } from "sequelize";
import {
  getActiveCustodialWallets,
  getCustodialWalletContract,
  getCustodialWalletTokenBalance,
} from "./custodialWallet";
import { logger } from "@b/utils/console";


export async function checkBlockchainExtensions() {
  const solanaService = await getSolanaService();
  const tronService = await getTronService();
  const moneroService = await getMoneroService();
  const tonService = await getTonService();

  return {
    solana: isServiceAvailable(solanaService),
    tron: isServiceAvailable(tronService),
    monero: isServiceAvailable(moneroService),
    ton: isServiceAvailable(tonService),
  };
} 

export const walletResponseAttributes = [
  "id",
  "currency",
  "chain",
  "address",
  "status",
  "balance",
];

import { PublicKey } from "@solana/web3.js";
import { createUTXOWallet } from "./utxo";

export async function getActiveTokensByCurrency(
  currency: string
): Promise<ecosystemTokenAttributes[]> {
  const tokens = await models.ecosystemToken.findAll({
    where: { currency, status: true },
  });

  const filteredTokens = tokens.filter((token) => {
    // Special handling for chains with dedicated services or UTXO chains - always allow
    const specialChains = ['XMR', 'TON', 'SOL', 'TRON', 'BTC', 'LTC', 'DOGE', 'DASH'];
    if (specialChains.includes(token.chain)) {
      return true; // These chains have dedicated services/UTXO handling and don't require network env var matching
    }

    const chainEnvVar = `${token.chain.toUpperCase()}_NETWORK`;
    const expectedNetwork = process.env[chainEnvVar];

    // If no environment variable is set, skip this token
    if (!expectedNetwork) {
      return false;
    }

    // Flexible network matching
    if (token.network === expectedNetwork) {
      return true;
    }

    // Handle common network name variations
    const networkMappings = {
      'BSC': 'mainnet',
      'ETH': 'mainnet',
      'POLYGON': 'mainnet',
      'ARBITRUM': 'mainnet',
      'OPTIMISM': 'mainnet',
      'AVALANCHE': 'mainnet',
      'FANTOM': 'mainnet'
    };

    // Check if token network matches chain name and expected is mainnet
    if (token.network === token.chain && expectedNetwork === 'mainnet') {
      return true;
    }

    // Check reverse mapping
    if (networkMappings[token.chain] === token.network && expectedNetwork === 'mainnet') {
      return true;
    }

    return false;
  });

  if (filteredTokens.length === 0) {
    throw createError({
      statusCode: 500,
      message: "No enabled tokens found for this currency",
    });
  }

  return filteredTokens;
}

export async function getWalletByUserIdAndCurrency(
  userId: string,
  currency: string,
  type: string = "ECO", // Default to ECO for backward compatibility
  transaction?: any,
  lock?: boolean // Whether to lock the row when using transaction
) {
  // Step 1: Fetch the wallet for the specified user and currency.
  let wallet = await models.wallet.findOne({
    where: {
      userId,
      currency,
      type, // Use provided type parameter
    },
    attributes: ["id", "type", "currency", "balance", "address"],
    ...(transaction && { transaction }),
    ...(transaction && lock && { lock: transaction.LOCK.UPDATE }),
  });

  // Step 2: For COPY_TRADING wallets, return immediately (no address generation needed)
  // CT wallets are internal-only and don't need blockchain addresses
  if (type === "COPY_TRADING") {
    return wallet; // Can be null - caller will create if needed
  }

  // Step 3: If no ECO wallet is found, generate a new wallet with addresses
  if (!wallet) {
    wallet = await storeWallet({ id: userId }, currency);
  }

  // Step 4: If wallet is still not found after attempting creation, throw an error.
  if (!wallet) {
    throw createError(404, "Wallet not found");
  }

  // Step 4: Retrieve active tokens for the currency.
  const tokens = await getActiveTokensByCurrency(currency);
  // Step 5: Check if the wallet's address is empty or if it has incomplete addresses.
  let addresses = {};

  try {
    if (wallet.address) {
      if (typeof wallet.address === "string") {
        addresses = JSON.parse(wallet.address);
      } else {
        addresses = wallet.address;
      }

      if (typeof addresses === "string") {
        addresses = JSON.parse(addresses);
      }
    }
  } catch (error) {
    logger.error("WALLET", `Failed to parse wallet address for wallet ${wallet.id}: ${error.message}`);
    logger.debug("WALLET", `Raw address value: ${wallet.address}`);

    // Try to repair common JSON errors
    if (typeof wallet.address === "string") {
      try {
        // Fix missing colons (e.g., "balance"0.123 -> "balance":0.123)
        const repairedAddress = wallet.address.replace(/"(\w+)"(\d+\.?\d*)/g, '"$1":$2');
        addresses = JSON.parse(repairedAddress);
        logger.success("WALLET", `Repaired corrupted wallet address JSON for wallet ${wallet.id}`);

        // Save the repaired address back to database
        await models.wallet.update(
          { address: JSON.stringify(addresses) },
          { where: { id: wallet.id } }
        );
      } catch (repairError) {
        logger.error("WALLET", `Failed to repair wallet address: ${repairError.message}`);
        // Reset to empty addresses object
        addresses = {};
      }
    }
  }

  if (
    !addresses ||
    (addresses && Object.keys(addresses).length < tokens.length)
  ) {
    const tokensWithoutAddress = tokens.filter(
      (token) => !addresses || !addresses.hasOwnProperty(token.chain)
    );
    // Generate and add missing addresses to the wallet.
    if (tokensWithoutAddress.length > 0) {
      await sequelize.transaction(async (transaction) => {
        await generateAndAddAddresses(
          wallet,
          tokensWithoutAddress,
          transaction
        );
      });
    }

    // Fetch and return the updated wallet after generating missing addresses.
    const updatedWallet = await models.wallet.findOne({
      where: { id: wallet.id },
      attributes: ["id", "type", "currency", "balance", "address"],
    });

    if (!updatedWallet) {
      throw createError(500, "Failed to update wallet with new addresses");
    }

    return updatedWallet;
  }

  return wallet;
}

export const storeWallet = async (user, currency) => {
  const tokens = await getActiveTokensByCurrency(currency);
  if (!tokens.length) {
    handleError("No enabled tokens found for this currency");
  }

  try {
    encrypt("test");
  } catch (error) {
    handleError("Encryption key is not set");
  }

  return await sequelize.transaction(async (transaction) => {
    const existingWallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency: currency,
        type: "ECO",
      },
      transaction,
    });

    // if exists and addresses is empty then return it
    let addresses =
      existingWallet && existingWallet.address
        ? typeof existingWallet.address === "string"
          ? JSON.parse(existingWallet.address)
          : existingWallet.address
        : {};
    if (typeof addresses === "string") {
      addresses = JSON.parse(addresses);
    }
    if (existingWallet && addresses && Object.keys(addresses).length === 0) {
      return existingWallet;
    }

    // Proceed with wallet creation if not exists
    const newWallet = await models.wallet.create(
      {
        userId: user.id,
        type: "ECO",
        currency,
        balance: 0,
        inOrder: 0,
        status: true,
        address: JSON.stringify({}), // Initialize with empty addresses object
      },
      { transaction }
    );
    if (!newWallet) {
      throw new Error("Failed to create wallet");
    }
    return await generateAndAddAddresses(newWallet, tokens, transaction);
  });
};

export const generateAndAddAddresses = async (wallet, tokens, transaction) => {
  let addresses = wallet.address
    ? typeof wallet.address === "string"
      ? JSON.parse(wallet.address)
      : wallet.address
    : {};
  if (typeof addresses === "string") {
    addresses = JSON.parse(addresses);
  }

  for (const token of tokens) {
    try {
      switch (token.contractType) {
        case "PERMIT":
          if (token.chain === "SOL") {
            await handleSolanaWallet(wallet, addresses, transaction);
          } else {
            await handlePermitContract(token, wallet, addresses, transaction);
          }
          break;
        case "NO_PERMIT":
          await handleNoPermitContract(token, wallet, addresses);
          break;
        case "NATIVE":
          if (token.chain === "SOL") {
            await handleSolanaNativeWallet(wallet, addresses, transaction);
          } else if (token.chain === "TRON") {
            await handleTronNativeWallet(wallet, addresses, transaction);
          } else if (token.chain === "XMR") {
            await handleMoneroNativeWallet(wallet, addresses, transaction);
          } else if (token.chain === "TON") {
            await handleTonNativeWallet(wallet, addresses, transaction);
          } else {
            await handleNativeContract(token, wallet, addresses, transaction);
          }
          break;
        default:
          handleError(`Unknown contract type for token ${token.name}`, false);
      }
    } catch (error) {
      handleError(
        `Failed to generate address for token ${token.name}: ${error.message}`,
        false
      );
    }
  }

  if (Object.keys(addresses).length === 0) {
    handleError("Failed to generate any addresses for the wallet");
  }

  // Update the wallet with the new addresses
  await models.wallet.update(
    { address: JSON.stringify(addresses) as any },
    {
      where: { id: wallet.id },
      transaction,
    }
  );

  const updatedWallet = await models.wallet.findOne({
    where: { id: wallet.id },
    transaction,
  });

  if (!updatedWallet) {
    handleError("Failed to update wallet with new addresses");
  }

  return updatedWallet;
};

const handleNativeContract = async (
  token,
  newWallet,
  addresses,
  transaction
) => {
  let encryptedWalletData;
  if (["BTC", "LTC", "DOGE", "DASH"].includes(token.chain)) {
    const wallet = createUTXOWallet(token.chain);
    addresses[token.chain] = {
      address: wallet.address,
      network: token.network,
      balance: 0,
    };

    encryptedWalletData = encrypt(JSON.stringify(wallet.data));
  } else {
    const wallet = ethers.Wallet.createRandom();
    if (!wallet.mnemonic) throw new Error("Mnemonic not found");
    const hdNode = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic.phrase);

    addresses[token.chain] = {
      address: hdNode.address,
      network: token.network,
      balance: 0,
    };

    if (!hdNode.mnemonic) throw new Error("Mnemonic not found");
    encryptedWalletData = encrypt(
      JSON.stringify({
        mnemonic: hdNode.mnemonic.phrase,
        publicKey: hdNode.publicKey,
        privateKey: hdNode.privateKey,
        xprv: hdNode.extendedKey,
        xpub: hdNode.neuter().extendedKey,
        chainCode: hdNode.chainCode,
        path: hdNode.path,
      })
    );
  }
  const walletData = await models.walletData.findOne({
    where: {
      walletId: newWallet.id,
      currency: token.currency,
      chain: token.chain,
    },
    transaction,
  });

  if (walletData) {
    // Update the existing record
    await walletData.update(
      {
        balance: 0, // Update this as per your logic
        index: 0,
        data: encryptedWalletData,
      },
      transaction
    );
  } else {
    // Create a new record
    await models.walletData.create(
      {
        walletId: newWallet.id,
        currency: token.currency,
        chain: token.chain,
        balance: 0,
        index: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  }
};

const handleSolanaNativeWallet = async (wallet, addresses, transaction) => {
  const SolanaService = await getSolanaService();
  if (!SolanaService) {
    throw new Error("Solana service not available");
  }
  const solanaService = await SolanaService.getInstance();
  const { address, data } = solanaService.createWallet();

  addresses["SOL"] = {
    address,
    network: process.env.SOLANA_NETWORK || "mainnet",
    balance: 0,
  };

  const encryptedWalletData = encrypt(JSON.stringify(data));

  const walletData = await models.walletData.findOne({
    where: {
      walletId: wallet.id,
      currency: "SOL",
      chain: "SOL",
    },
    transaction,
  });

  if (walletData) {
    // Update the existing record
    await walletData.update(
      {
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  } else {
    // Create a new record
    await models.walletData.create(
      {
        walletId: wallet.id,
        currency: "SOL",
        chain: "SOL",
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  }
};

const handleSolanaWallet = async (wallet, addresses, transaction) => {
  const SolanaService = await getSolanaService();
  if (!SolanaService) {
    throw new Error("Solana service not available");
  }
  const solanaService = await SolanaService.getInstance();
  const { address, data } = solanaService.createWallet();

  addresses["SOL"] = {
    address,
    network: process.env.SOLANA_NETWORK || "mainnet",
    balance: 0,
  };

  const encryptedWalletData = encrypt(JSON.stringify(data));

  const walletData = await models.walletData.findOne({
    where: {
      walletId: wallet.id,
      currency: wallet.currency,
      chain: "SOL",
    },
    transaction,
  });

  if (walletData) {
    // Update the existing record
    await walletData.update(
      {
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  } else {
    // Create a new record
    await models.walletData.create(
      {
        walletId: wallet.id,
        currency: wallet.currency,
        chain: "SOL",
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  }
};

const handleTronNativeWallet = async (wallet, addresses, transaction) => {
  const TronService = await getTronService();
  if (!TronService) {
    throw new Error("Tron service not available");
  }
  const tronService = await TronService.getInstance();
  const { address, data } = tronService.createWallet();

  addresses["TRON"] = {
    address,
    network: process.env.TRON_NETWORK || "mainnet",
    balance: 0,
  };

  const encryptedWalletData = encrypt(JSON.stringify(data));

  const walletData = await models.walletData.findOne({
    where: {
      walletId: wallet.id,
      currency: "TRX",
      chain: "TRON",
    },
    transaction,
  });

  if (walletData) {
    // Update the existing record
    await walletData.update(
      {
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  } else {
    // Create a new record
    await models.walletData.create(
      {
        walletId: wallet.id,
        currency: "TRX",
        chain: "TRON",
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  }
};

const handleMoneroNativeWallet = async (wallet, addresses, transaction) => {
  const MoneroService = await getMoneroService();
  if (!MoneroService) {
    throw new Error("Monero service not available");
  }
  const moneroService = await MoneroService.getInstance();
  const { address, data } = await moneroService.createWallet(wallet.id);

  addresses["XMR"] = {
    address,
    network: process.env.MONERO_NETWORK || "mainnet",
    balance: 0,
  };

  const encryptedWalletData = encrypt(JSON.stringify(data));

  const walletData = await models.walletData.findOne({
    where: {
      walletId: wallet.id,
      currency: "XMR",
      chain: "XMR",
    },
    transaction,
  });

  if (walletData) {
    // Update the existing record
    await walletData.update(
      {
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  } else {
    // Create a new record
    await models.walletData.create(
      {
        walletId: wallet.id,
        currency: "XMR",
        chain: "XMR",
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  }
};

const handleTonNativeWallet = async (wallet, addresses, transaction) => {
  const TonService = await getTonService();
  if (!TonService) {
    throw new Error("TON service not available");
  }
  const tonService = await TonService.getInstance();
  const { address, data } = await tonService.createWallet();

  addresses["TON"] = {
    address,
    network: process.env.TON_NETWORK || "mainnet",
    balance: 0,
  };

  const encryptedWalletData = encrypt(JSON.stringify(data));

  const walletData = await models.walletData.findOne({
    where: {
      walletId: wallet.id,
      currency: "TON",
      chain: "TON",
    },
    transaction,
  });

  if (walletData) {
    // Update the existing record
    await walletData.update(
      {
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  } else {
    // Create a new record
    await models.walletData.create(
      {
        walletId: wallet.id,
        currency: "TON",
        chain: "TON",
        balance: 0,
        data: encryptedWalletData,
      },
      { transaction }
    );
  }
};

const handleError = (message, throwIt = true) => {
  logger.error("WALLET", message);
  if (throwIt) {
    throw new Error(message);
  }
};

const handlePermitContract = async (
  token,
  newWallet,
  addresses,
  transaction
) => {
  // Assuming the 'token' object has properties: chain, network, contractType
  const masterWallet = await models.ecosystemMasterWallet.findOne({
    where: { chain: token.chain, status: true },
    transaction,
  });

  if (!masterWallet || !masterWallet.data) {
    logger.warn("WALLET", `Skipping chain ${token.chain} - Master wallet not found or not enabled`);
    return;
  }

  const nextIndex =
    masterWallet.lastIndex != null ? masterWallet.lastIndex + 1 : 1;
  await models.ecosystemMasterWallet.update(
    { lastIndex: nextIndex },
    {
      where: { id: masterWallet.id },
      transaction,
    }
  );

  const decryptedMasterData = JSON.parse(decrypt(masterWallet.data));
  const hdNode = ethers.HDNodeWallet.fromPhrase(decryptedMasterData.mnemonic);
  const childNode = hdNode.deriveChild(nextIndex);

  if (!childNode.address) {
    throw new Error("Address failed to generate");
  }

  addresses[token.chain] = {
    address: childNode.address,
    network: token.network,
    balance: 0,
  };

  const encryptedChildData = encrypt(
    JSON.stringify({
      address: childNode.address,
      publicKey: childNode.publicKey,
      privateKey: childNode.privateKey,
    })
  );

  const walletData = await models.walletData.findOne({
    where: {
      walletId: newWallet.id,
      currency: token.currency,
      chain: token.chain,
    },
    transaction,
  });

  if (walletData) {
    // Update the existing record
    await walletData.update(
      {
        balance: 0, // Update this as per your logic
        index: nextIndex,
        data: encryptedChildData,
      },
      { transaction }
    );
  } else {
    // Create a new record
    await models.walletData.create(
      {
        walletId: newWallet.id,
        currency: token.currency,
        chain: token.chain,
        balance: 0,
        index: nextIndex,
        data: encryptedChildData,
      },
      { transaction }
    );
  }
};

const handleNoPermitContract = async (token, newWallet, addresses) => {
  addresses[token.chain] = {
    balance: 0,
  };
};

export async function getMasterWalletByChain(
  chain: string
): Promise<ecosystemMasterWalletAttributes | null> {
  try {
    return await models.ecosystemMasterWallet.findOne({
      where: { chain },
      attributes: walletResponseAttributes,
    });
  } catch (error) {
    logger.error("WALLET", "Failed to get master wallet by chain", error);
    throw error;
  }
}

export async function getMasterWalletByChainFull(
  chain: string
): Promise<ecosystemMasterWalletAttributes> {
  try {
    const wallet = await models.ecosystemMasterWallet.findOne({
      where: { chain },
    });

    if (!wallet) {
      throw new Error(`Master wallet not found for chain: ${chain}`);
    }

    return wallet;
  } catch (error) {
    logger.error("WALLET", "Failed to get master wallet by chain", error);
    throw error;
  }
}

export async function checkEcosystemAvailableFunds(
  userWallet,
  walletData,
  totalAmount
) {
  try {
    logger.debug("WALLET", `Checking funds availability: walletId=${userWallet.id}, totalAmount=${totalAmount}, currentBalance=${userWallet.balance}`);

    const totalAvailable = await getTotalAvailable(userWallet, walletData);
    logger.debug("WALLET", `Total available: ${totalAvailable}`);

    if (totalAvailable < totalAmount) {
      logger.error("WALLET", `Insufficient funds: available ${totalAvailable} < required ${totalAmount}`);
      throw new Error("Insufficient funds for withdrawal including fee");
    }

    return totalAvailable;
  } catch (error) {
    logger.error("WALLET", "Error checking funds", error);
    if (error.message === "Insufficient funds for withdrawal including fee") {
      throw error;
    }
    throw new Error("Withdrawal failed - please try again later");
  }
}

const getTotalAvailable = async (userWallet, walletData) => {
  const pvEntry = await models.ecosystemPrivateLedger.findOne({
    where: {
      walletId: userWallet.id,
      index: walletData.index,
      currency: userWallet.currency,
      chain: walletData.chain,
    },
  });
  return userWallet.balance + (pvEntry ? pvEntry.offchainDifference : 0);
};

export async function getGasPayer(chain, provider) {
  try {
    logger.debug("WALLET", `Getting gas payer for chain: ${chain}`);
    const masterWallet = await getMasterWalletByChainFull(chain);
    if (!masterWallet) {
      logger.error("WALLET", `Master wallet not found for chain: ${chain}`);
      throw new Error("Master wallet not found");
    }
    const { data } = masterWallet;
    if (!data) {
      logger.error("WALLET", `Master wallet data not found for chain: ${chain}`);
      throw new Error("Master wallet data not found");
    }
    logger.debug("WALLET", `Decrypting master wallet data`);
    const decryptedMasterData = JSON.parse(decrypt(data));
    return new ethers.Wallet(decryptedMasterData.privateKey, provider);
  } catch (error) {
    logger.error("WALLET", "Error getting gas payer", error);
    throw new Error("Withdrawal failed - please try again later");
  }
}

export const validateAddress = (toAddress: string, chain: string) => {
  if (chain === "SOL") {
    // Solana address validation
    try {
      new PublicKey(toAddress);
    } catch (error) {
      throw new Error(`Invalid Solana address: ${toAddress}`);
    }
  } else if (chain === "TRON") {
    // Tron address validation (should start with 'T')
    if (!toAddress.startsWith("T")) {
      throw new Error(`Invalid Tron address: ${toAddress}`);
    }
  } else if (chain === "XMR") {
    // Monero address validation (starts with '4' or '8')
    if (!toAddress.startsWith("4") && !toAddress.startsWith("8")) {
      throw new Error(`Invalid Monero address: ${toAddress}`);
    }
  } else if (chain === "TON") {
    try {
      // Accept both raw and user-friendly TON addresses
      const tonAddress = new TonWeb.utils.Address(toAddress);
      if (!tonAddress || !tonAddress.toString()) {
        throw new Error(`Invalid TON address: ${toAddress}`);
      }
    } catch (error) {
      throw new Error(`Invalid TON address: ${toAddress}`);
    }
  } else {
    // Ethereum address validation (via ethers.js)
    if (!ethers.isAddress(toAddress)) {
      throw new Error(`Invalid target wallet address: ${toAddress}`);
    }
  }
};

export const validateEcosystemBalances = async (
  tokenContract,
  actualTokenOwner,
  amount
) => {
  try {
    const tokenOwnerBalance = (
      await tokenContract.balanceOf(actualTokenOwner.address)
    ).toString();

    if (tokenOwnerBalance < amount) {
      throw new Error("Insufficient funds in the wallet for withdrawal");
    }

    return true;
  } catch (error) {
    logger.error("WALLET", "Failed to validate ecosystem balances", error);
    throw error;
  }
};

export const getEcosystemTokenOwner = (walletData, provider) => {
  const { data } = walletData;
  const decryptedData = JSON.parse(decrypt(data));
  const { privateKey } = decryptedData;
  return new ethers.Wallet(privateKey, provider);
};

export const initializeContracts = async (chain, currency, provider) => {
  try {
    const { contractAddress, contractType, tokenDecimals } =
      await getTokenContractAddress(chain, currency);
    const gasPayer = await getGasPayer(chain, provider);
    const { abi } = await getSmartContract("token", "ERC20");
    const contract = new ethers.Contract(contractAddress, abi, provider);

    return {
      contract,
      contractAddress,
      gasPayer,
      contractType,
      tokenDecimals,
    };
  } catch (error) {
    logger.error("WALLET", "Failed to initialize contracts", error);
    throw error;
  }
};

export const executeEcosystemWithdrawal = async (
  tokenContract,
  tokenContractAddress,
  gasPayer,
  tokenOwner,
  toAddress,
  amount,
  provider
) => {
  try {
    const gasPrice = await getAdjustedGasPrice(provider);
    const transferFromTransaction = {
      to: tokenContractAddress,
      from: gasPayer.address,
      data: tokenContract.interface.encodeFunctionData("transferFrom", [
        tokenOwner.address,
        toAddress,
        amount,
      ]),
    };

    const gasLimitForTransferFrom = await estimateGas(
      transferFromTransaction,
      provider
    );

    const trx = await tokenContract
      .connect(gasPayer)
      .getFunction("transferFrom")
      .send(tokenOwner.address, toAddress, amount, {
        gasPrice: gasPrice,
        gasLimit: gasLimitForTransferFrom,
      });

    await trx.wait(2);

    return trx;
  } catch (error) {
    logger.error("WALLET", "Failed to execute ecosystem withdrawal", error);
    throw error;
  }
};

export const executeNoPermitWithdrawal = async (
  chain,
  tokenContractAddress,
  gasPayer,
  toAddress,
  amount: bigint,
  provider,
  isNative: boolean
) => {
  try {
    const custodialWallets = await getActiveCustodialWallets(chain);
    if (!custodialWallets || custodialWallets.length === 0) {
      throw new Error("No custodial wallets found");
    }

    let tokenOwner, custodialContract, custodialContractAddress;
    for (const custodialWallet of custodialWallets) {
      const custodialWalletContract = await getCustodialWalletContract(
        custodialWallet.address,
        provider
      );
      const balance = await getCustodialWalletTokenBalance(
        custodialWalletContract,
        tokenContractAddress
      );

      if (BigInt(balance) >= amount) {
        tokenOwner = custodialWallet;
        custodialContract = custodialWalletContract;
        custodialContractAddress = custodialWallet.address;
        break;
      }
    }
    if (!tokenOwner) {
      throw new Error("No custodial wallets found");
    }

    let trx;
    if (isNative) {
      trx = await custodialContract
        .connect(gasPayer)
        .getFunction("transferNative")
        .send(toAddress, amount);
    } else {
      trx = await custodialContract
        .connect(gasPayer)
        .getFunction("transferTokens")
        .send(tokenContractAddress, toAddress, amount);
    }

    await trx.wait(2);

    return trx;
  } catch (error) {
    logger.error("WALLET", "Failed to execute no permit withdrawal", error);
    throw error;
  }
};

export async function getAndValidateTokenOwner(
  walletData,
  amountEth,
  tokenContract,
  provider
) {
  try {
    let alternativeWalletUsed = false;
    const tokenOwner = await getEcosystemTokenOwner(walletData, provider);
    let actualTokenOwner = tokenOwner;
    let alternativeWallet: any = null;

    const onChainBalance = await tokenContract.balanceOf(tokenOwner.address);
    if (onChainBalance < amountEth) {
      const alternativeWalletData = await findAlternativeWalletData(
        walletData,
        fromBigInt(amountEth)
      );
      alternativeWallet = alternativeWalletData;
      actualTokenOwner = getEcosystemTokenOwner(
        alternativeWalletData,
        provider
      );
      alternativeWalletUsed = true;
    }

    validateEcosystemBalances(tokenContract, actualTokenOwner, amountEth);

    return { actualTokenOwner, alternativeWalletUsed, alternativeWallet };
  } catch (error) {
    logger.error("WALLET", "Failed to get and validate token owner", error);
    throw error;
  }
}

export const executePermit = async (
  tokenContract,
  tokenContractAddress,
  gasPayer,
  tokenOwner,
  amount,
  provider
) => {
  try {
    const nonce = await tokenContract.nonces(tokenOwner.address);
    const deadline = getTimestampInSeconds() + 4200;
    const domain: ethers.TypedDataDomain = {
      chainId: await getChainId(provider),
      name: await tokenContract.name(),
      verifyingContract: tokenContractAddress,
      version: "1",
    };

    const types = {
      Permit: [
        {
          name: "owner",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "value",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "deadline",
          type: "uint256",
        },
      ],
    };

    const values = {
      owner: tokenOwner.address,
      spender: gasPayer.address,
      value: amount,
      nonce: nonce,
      deadline: deadline,
    };

    const signature = await tokenOwner.signTypedData(domain, types, values);
    const sig = ethers.Signature.from(signature);

    const recovered = ethers.verifyTypedData(domain, types, values, sig);
    if (recovered !== tokenOwner.address) {
      throw new Error("Invalid signature");
    }

    const gasPrice = await getAdjustedGasPrice(provider);

    const permitTransaction = {
      to: tokenContractAddress,
      from: tokenOwner.address,
      nonce: nonce,
      data: tokenContract.interface.encodeFunctionData("permit", [
        tokenOwner.address,
        gasPayer.address,
        amount,
        deadline,
        sig.v,
        sig.r,
        sig.s,
      ]),
    };

    const gasLimitForPermit = await estimateGas(permitTransaction, provider);

    const gasPayerBalance = (
      await tokenContract.balanceOf(gasPayer.address)
    ).toString();
    if (
      BigInt(gasPayerBalance) <
      BigInt(gasLimitForPermit) * gasPrice * BigInt(2)
    ) {
      throw new Error("Withdrawal failed, Please contact support team.");
    }

    const tx = await tokenContract
      .connect(gasPayer)
      .getFunction("permit")
      .send(
        tokenOwner.address,
        gasPayer.address,
        amount,
        deadline,
        sig.v,
        sig.r,
        sig.s,
        {
          gasPrice: gasPrice,
          gasLimit: gasLimitForPermit,
        }
      );

    await tx.wait(2);

    return tx;
  } catch (error) {
    logger.error("WALLET", "Failed to execute permit", error);
    throw error;
  }
};

export const executeNativeWithdrawal = async (
  payer,
  toAddress,
  amount,
  provider
) => {
  try {
    const balance = await provider.getBalance(payer.address);
    if (balance < amount) {
      throw new Error("Insufficient funds for withdrawal");
    }

    const tx = {
      to: toAddress,
      value: amount,
    };

    const response = await payer.sendTransaction(tx);
    await response.wait(2);

    return response;
  } catch (error) {
    logger.error("WALLET", "Failed to execute native withdrawal", error);
    throw error;
  }
};

export async function getAndValidateNativeTokenOwner(
  walletData,
  amountEth,
  provider
) {
  try {
    const tokenOwner = await getEcosystemTokenOwner(walletData, provider);
    const onChainBalance = await provider.getBalance(tokenOwner.address);
    if (onChainBalance < amountEth) {
      throw new Error("Insufficient funds in the wallet for withdrawal");
    }

    return tokenOwner;
  } catch (error) {
    logger.error("WALLET", "Failed to get and validate native token owner", error);
    throw error;
  }
}

export async function getWalletData(walletId: string, chain: string) {
  try {
    return await models.walletData.findOne({
      where: {
        walletId: walletId,
        chain: chain,
      },
    });
  } catch (error) {
    logger.error("WALLET", "Failed to get wallet data", error);
    throw error;
  }
}

export async function findAlternativeWalletData(walletData, amount) {
  try {
    const alternativeWalletData = await models.walletData.findOne({
      where: {
        currency: walletData.currency,
        chain: walletData.chain,
        balance: {
          [Op.gte]: amount,
        },
      },
    });

    if (!alternativeWalletData) {
      throw new Error("No alternative wallet with sufficient balance found");
    }

    return alternativeWalletData;
  } catch (error) {
    logger.error("WALLET", "Failed to find alternative wallet data", error);
    throw error;
  }
}

export async function getEcosystemPendingTransactions() {
  try {
    return await models.transaction.findAll({
      where: {
        type: "WITHDRAW",
        status: "PENDING",
      },
      include: [{ model: models.wallet, where: { type: "ECO" } }],
    });
  } catch (error) {
    logger.error("WALLET", "Failed to get ecosystem pending transactions", error);
    throw error;
  }
}

export const handleEcosystemDeposit = async (trx) => {
  try {
    const wallet = await models.wallet.findOne({
      where: { id: trx.id },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // For XMR and other pay-to-many chains, check transaction by both trxId AND walletId
    // This allows multiple recipients to receive from the same transaction
    // Note: Ecosystem uses trxId, referenceId is for spot trading
    const transaction = await models.transaction.findOne({
      where: {
        trxId: trx.hash,
        walletId: wallet.id, // Check per wallet, not globally
      },
    });

    if (transaction) {
      throw new Error("Transaction already processed for this wallet");
    }

    const addresses = JSON.parse(wallet.address as any);
    const chainAddress = addresses[trx.chain];
    if (!chainAddress) {
      throw new Error("Address not found for the given chain");
    }

    const depositAmount = parseFloat(trx.amount);
    logger.debug("DEPOSIT", `Processing deposit for wallet ${wallet.id}`);
    logger.debug("DEPOSIT", `Current wallet balance: ${wallet.balance} ${wallet.currency}`);
    logger.debug("DEPOSIT", `Current chain balance: ${chainAddress.balance || 0} ${wallet.currency}`);
    logger.debug("DEPOSIT", `Deposit amount (trx.amount): ${trx.amount} ${wallet.currency}`);
    logger.debug("DEPOSIT", `Parsed deposit amount: ${depositAmount} ${wallet.currency}`);

    // Apply precision to prevent floating-point errors
    const newChainBalance = updateBalancePrecision(
      (chainAddress.balance || 0) + depositAmount,
      trx.chain
    );
    const walletBalance = updateBalancePrecision(
      wallet.balance + depositAmount,
      trx.chain
    );
    chainAddress.balance = newChainBalance;

    logger.debug("DEPOSIT", `New chain balance: ${chainAddress.balance} ${wallet.currency}`);
    logger.debug("DEPOSIT", `New wallet balance: ${walletBalance} ${wallet.currency}`);

    // Ensure the addresses object is properly formatted
    addresses[trx.chain] = {
      address: chainAddress.address,
      network: chainAddress.network,
      balance: chainAddress.balance,
    };

    // **Calculate the fee appropriately**
    let fee = 0;
    const utxoChains = ["BTC", "DOGE", "LTC", "DASH"];
    if (utxoChains.includes(trx.chain)) {
      // For UTXO-based chains
      // Note: inputs and outputs are already converted from satoshis to standard units
      const totalInputValue = trx.inputs.reduce((sum, input) => {
        const inputValue = input.output_value || input.value || 0;
        return sum + parseFloat(inputValue);
      }, 0);

      const totalOutputValue = trx.outputs.reduce((sum, output) => {
        const outputValue = output.value || 0;
        return sum + parseFloat(outputValue);
      }, 0);

      // Calculate the fee
      fee = totalInputValue - totalOutputValue;
    } else {
      // For EVM-based chains
      if (!isNaN(parseFloat(trx.gasUsed)) && !isNaN(parseFloat(trx.gasPrice))) {
        fee = parseFloat(trx.gasUsed) * parseFloat(trx.gasPrice);
      } else {
        fee = 0;
      }
    }

    await models.wallet.update(
      {
        balance: walletBalance,
        address: JSON.stringify(addresses) as any,
      },
      {
        where: { id: wallet.id },
      }
    );

    // Format 'from' field for description (handle array or string)
    const fromAddress = Array.isArray(trx.from)
      ? trx.from[0] || 'Unknown'
      : trx.from || 'Unknown';

    const createdTransaction = await models.transaction.create({
      userId: wallet.userId,
      walletId: wallet.id,
      type: "DEPOSIT",
      status: trx.status === "CONFIRMED" ? "COMPLETED" : trx.status,
      amount: parseFloat(trx.amount),
      description: `Deposit of ${trx.amount} ${wallet.currency} from ${fromAddress}`,
      trxId: trx.hash,
      fee: fee,
      metadata: JSON.stringify({
        chain: trx.chain,
        currency: wallet.currency,
        gasLimit: trx.gasLimit,
        gasPrice: trx.gasPrice,
        gasUsed: trx.gasUsed,
        from: trx.from, // Store full array in metadata
        to: trx.to,
        inputs: trx.inputs,
        outputs: trx.outputs,
      }),
    });

    // Save UTXOs for UTXO-based chains (BTC, LTC, DOGE, DASH)
    if (utxoChains.includes(trx.chain) && trx.outputs && Array.isArray(trx.outputs)) {
      logger.debug("UTXO", `Saving UTXOs for ${trx.chain} transaction ${trx.hash}`);

      // Filter outputs that belong to this wallet's address
      const walletAddress = chainAddress.address;
      const walletOutputs = trx.outputs.filter(output =>
        output.addresses && output.addresses.includes(walletAddress)
      );

      logger.debug("UTXO", `Found ${walletOutputs.length} outputs for wallet address ${walletAddress}`);

      // Save each UTXO to the database
      for (let i = 0; i < trx.outputs.length; i++) {
        const output = trx.outputs[i];

        // Only save outputs that belong to this wallet
        if (output.addresses && output.addresses.includes(walletAddress)) {
          try {
            await models.ecosystemUtxo.create({
              walletId: wallet.id,
              transactionId: trx.hash,
              index: i,
              amount: parseFloat(output.value),
              script: output.script || '',
              status: false, // false = unspent
            });

            logger.debug("UTXO", `Saved UTXO: ${trx.hash}:${i} amount=${output.value} ${wallet.currency}`);
          } catch (utxoError) {
            logger.error("UTXO", `Failed to save UTXO ${trx.hash}:${i}: ${utxoError.message}`);
            // Don't throw - continue processing other UTXOs
          }
        }
      }

      logger.debug("UTXO", `Completed UTXO save for transaction ${trx.hash}`);
    }

    const updatedWallet = await models.wallet.findOne({
      where: { id: wallet.id },
    });

    // Update wallet_data balance with precision handling
    logger.debug("DEPOSIT", `Updating wallet_data for walletId: ${wallet.id}, chain: ${trx.chain}`);
    const walletData = await models.walletData.findOne({
      where: {
        walletId: wallet.id,
        chain: trx.chain,
      },
    });

    if (walletData) {
      logger.debug("DEPOSIT", `Current wallet_data balance: ${walletData.balance}`);
      logger.debug("DEPOSIT", `Deposit amount: ${trx.amount}`);

      // Parse both values to ensure numeric addition (not string concatenation)
      const currentBalance = parseFloat(walletData.balance) || 0;
      const depositAmount = parseFloat(trx.amount);

      logger.debug("DEPOSIT", `Parsed current balance: ${currentBalance}`);
      logger.debug("DEPOSIT", `Parsed deposit amount: ${depositAmount}`);

      const newBalance = updateBalancePrecision(
        currentBalance + depositAmount,
        trx.chain
      );

      logger.debug("DEPOSIT", `New wallet_data balance: ${newBalance}`);

      await models.walletData.update(
        {
          balance: newBalance,
        },
        {
          where: {
            walletId: wallet.id,
            chain: trx.chain,
          },
        }
      );

      logger.debug("DEPOSIT", `Successfully updated wallet_data balance`);
    } else {
      logger.error("DEPOSIT", `No wallet_data found for walletId: ${wallet.id}, chain: ${trx.chain}`);
    }

    return {
      transaction: createdTransaction,
      wallet: updatedWallet,
    };
  } catch (error) {
    logger.error("WALLET", "Failed to handle ecosystem deposit", error);
    throw error;
  }
};

const satoshiToBTC = (value) => value / 1e8;

export async function updatePrivateLedger(
  wallet_id,
  index,
  currency,
  chain,
  difference
) {
  try {
    const networkValue = process.env[`${chain}_NETWORK`];

    const uniqueIdentifier = {
      walletId: wallet_id,
      index: index,
      currency: currency,
      chain: chain,
      network: networkValue,
    };

    const existingLedger = await models.ecosystemPrivateLedger.findOne({
      where: uniqueIdentifier,
    });

    if (existingLedger) {
      // Parse current value and add difference to prevent string concatenation
      const currentDifference = parseFloat(existingLedger.offchainDifference) || 0;
      const newDifference = currentDifference + parseFloat(difference);

      await models.ecosystemPrivateLedger.update(
        {
          offchainDifference: newDifference,
        },
        {
          where: uniqueIdentifier,
        }
      );
      return existingLedger;
    } else {
      return await models.ecosystemPrivateLedger.create({
        walletId: wallet_id,
        index: index,
        currency: currency,
        chain: chain,
        offchainDifference: parseFloat(difference),
        network: networkValue,
      });
    }
  } catch (error) {
    logger.error("WALLET", "Failed to update private ledger", error);
    throw error;
  }
}

const updateBalancePrecision = (balance, chain) => {
  const fixedPrecisionChains = {
    BTC: 8,
    LTC: 8,
    DOGE: 8,
    DASH: 8,
    SOL: 8,
    TRON: 6,
    XMR: 12,
    // EVM chains - use 8 decimals for balance precision
    BSC: 8,
    ETH: 8,
    POLYGON: 8,
    ARBITRUM: 8,
    OPTIMISM: 8,
    BASE: 8,
    AVAX: 8,
    FTM: 8,
    CELO: 8,
    RSK: 8,
  };

  if (fixedPrecisionChains[chain] !== undefined) {
    return parseFloat(balance.toFixed(fixedPrecisionChains[chain]));
  }
  return balance;
};

export const decrementWalletBalance = async (userWallet, chain, amount, dbTransaction?: Transaction) => {
  try {
    let newBalance = userWallet.balance - amount;
    newBalance = updateBalancePrecision(newBalance, chain);

    const addresses = JSON.parse(userWallet.address);
    if (addresses[chain]) {
      addresses[chain].balance = updateBalancePrecision(
        parseFloat(addresses[chain].balance) - amount,
        chain
      );
    } else {
      throw new Error(
        `Chain ${chain} not found in the user's wallet addresses.`
      );
    }

    const updateOptions: any = {
      where: { id: userWallet.id },
    };

    // If we have a database transaction, use it for atomic updates
    if (dbTransaction) {
      updateOptions.transaction = dbTransaction;
    }

    await models.wallet.update(
      {
        balance: newBalance,
        address: JSON.stringify(addresses) as any,
      },
      updateOptions
    );

    // Also update walletData balance for the specific chain
    // This keeps walletData in sync with wallet.address[chain].balance
    // Get current wallet_data balance first to apply precision
    const walletData = await models.walletData.findOne({
      where: {
        walletId: userWallet.id,
        chain: chain,
      },
      transaction: dbTransaction,
    });

    if (walletData) {
      const newWalletDataBalance = updateBalancePrecision(
        parseFloat(walletData.balance) - amount,
        chain
      );

      const walletDataUpdateOptions: any = {
        where: {
          walletId: userWallet.id,
          chain: chain,
        },
      };

      if (dbTransaction) {
        walletDataUpdateOptions.transaction = dbTransaction;
      }

      await models.walletData.update(
        {
          balance: newWalletDataBalance,
        },
        walletDataUpdateOptions
      );
    }
  } catch (error) {
    logger.error("WALLET", "Failed to decrement wallet balance", error);
    throw error;
  }
};

export async function createPendingTransaction(
  userId,
  walletId,
  currency,
  chain,
  amount,
  toAddress,
  withdrawalFee,
  token,
  dbTransaction?: Transaction
) {
  try {
    const createOptions: any = {
      userId: userId,
      walletId: walletId,
      type: "WITHDRAW",
      status: "PENDING",
      amount: amount,
      fee: withdrawalFee,
      description: `Pending withdrawal of ${amount} ${currency} to ${toAddress}`,
      metadata: JSON.stringify({
        toAddress: toAddress,
        chain: chain,
        contractType: token.contractType,
        contract: token.contract,
        decimals: token.decimals,
      }),
    };

    // If we have a database transaction, pass it as an option
    if (dbTransaction) {
      return await models.transaction.create(createOptions, { transaction: dbTransaction });
    }

    return await models.transaction.create(createOptions);
  } catch (error) {
    logger.error("WALLET", "Failed to create pending transaction", error);
    throw error;
  }
}

export const refundUser = async (transaction) => {
  try {
    await models.transaction.update(
      {
        status: "FAILED",
        description: `Refund of ${transaction.amount}`,
      },
      {
        where: { id: transaction.id },
      }
    );

    const wallet = await models.wallet.findOne({
      where: { id: transaction.walletId },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const metadata = JSON.parse(transaction.metadata);
    const addresses = JSON.parse(wallet.address as any);
    const amount = transaction.amount + transaction.fee;

    // Apply precision fix to prevent floating-point errors
    const chain = metadata?.chain;
    const precisionFixedAmount = updateBalancePrecision(amount, chain);

    if (chain && addresses[chain]) {
      const newChainBalance = addresses[chain].balance + precisionFixedAmount;
      addresses[chain].balance = updateBalancePrecision(newChainBalance, chain);
    }
    const walletBalance = updateBalancePrecision(wallet.balance + precisionFixedAmount, chain);

    await models.wallet.update(
      {
        balance: walletBalance,
        address: JSON.stringify(addresses) as any,
      },
      {
        where: { id: wallet.id },
      }
    );

    // Also refund walletData balance for the specific chain
    // This keeps walletData in sync with wallet.address[chain].balance
    if (chain) {
      const walletData = await models.walletData.findOne({
        where: {
          walletId: wallet.id,
          chain: chain,
        },
      });

      if (walletData) {
        const newWalletDataBalance = updateBalancePrecision(
          parseFloat(walletData.balance) + precisionFixedAmount,
          chain
        );

        await models.walletData.update(
          {
            balance: newWalletDataBalance,
          },
          {
            where: {
              walletId: wallet.id,
              chain: chain,
            },
          }
        );
      }
    }
  } catch (error) {
    logger.error("WALLET", "Failed to refund user", error);
    throw error;
  }
};

export const updateAlternativeWallet = async (currency, chain, amount) => {
  try {
    const alternativeWalletData = await models.walletData.findOne({
      where: {
        currency: currency,
        chain: chain,
      },
    });

    if (!alternativeWalletData) {
      throw new Error("Alternative wallet not found");
    }

    const newBalance = updateBalancePrecision(
      parseFloat(alternativeWalletData.balance) - amount,
      chain
    );

    await models.walletData.update(
      {
        balance: newBalance,
      },
      {
        where: { id: alternativeWalletData.id },
      }
    );

    await updatePrivateLedger(
      alternativeWalletData.walletId,
      alternativeWalletData.index,
      currency,
      chain,
      -amount
    );
  } catch (error) {
    logger.error("WALLET", "Failed to update alternative wallet", error);
    throw error;
  }
};

export async function updateWalletBalance(
  wallet: walletAttributes,
  balanceChange: number,
  type: "add" | "subtract",
  transaction?: any
): Promise<void> {
  try {
    if (!wallet) throw new Error("Wallet not found");

    const roundTo8DecimalPlaces = (num: number) =>
      Math.round((num + Number.EPSILON) * 1e8) / 1e8;

    // Fetch fresh wallet data with optional lock if inside transaction
    const freshWallet = transaction
      ? await models.wallet.findByPk(wallet.id, {
          lock: transaction.LOCK.UPDATE,
          transaction,
        })
      : await models.wallet.findByPk(wallet.id);
    if (!freshWallet) throw new Error("Wallet not found in database");

    let newBalance: number;
    let newInOrder: number;

    // Explicitly convert to numbers to handle Decimal types from database
    const currentBalance = parseFloat(freshWallet.balance.toString());
    const currentInOrder = parseFloat(freshWallet.inOrder?.toString() || "0");

    switch (type) {
      case "add":
        // When adding balance back (order cancelled/filled), decrease inOrder
        newBalance = roundTo8DecimalPlaces(currentBalance + balanceChange);
        newInOrder = roundTo8DecimalPlaces(currentInOrder - balanceChange);
        if (newInOrder < 0) newInOrder = 0; // Prevent negative inOrder
        break;
      case "subtract":
        // When subtracting balance (new order), increase inOrder
        newBalance = roundTo8DecimalPlaces(currentBalance - balanceChange);
        newInOrder = roundTo8DecimalPlaces(currentInOrder + balanceChange);
        if (newBalance < 0) {
          throw new Error(`Insufficient funds: need ${balanceChange}, have ${currentBalance}`);
        }
        break;
      default:
        throw new Error("Invalid type specified for updating wallet balance.");
    }

    await models.wallet.update(
      {
        balance: newBalance,
        inOrder: newInOrder,
      },
      {
        where: { id: wallet.id },
        ...(transaction && { transaction }),
      }
    );
  } catch (error) {
    logger.error("WALLET", "Failed to update wallet balance", error);
    throw error;
  }
}

/**
 * Updates wallet for order fill/execution (matching engine)
 * Different from updateWalletBalance which is for order creation/cancellation
 *
 * @param wallet - Wallet to update
 * @param balanceChange - Amount to change balance by
 * @param inOrderChange - Amount to change inOrder by (can be negative)
 * @param operation - Description for error messages
 */
export async function updateWalletForFill(
  wallet: walletAttributes,
  balanceChange: number,
  inOrderChange: number,
  operation: string
): Promise<void> {
  try {
    if (!wallet) throw new Error("Wallet not found");

    const roundTo8DecimalPlaces = (num: number) =>
      Math.round((num + Number.EPSILON) * 1e8) / 1e8;

    // Fetch fresh wallet data to prevent stale data issues
    const freshWallet = await models.wallet.findByPk(wallet.id);
    if (!freshWallet) throw new Error("Wallet not found in database");

    // Explicitly convert to numbers to handle Decimal types from database
    const currentBalance = parseFloat(freshWallet.balance.toString());
    const currentInOrder = parseFloat(freshWallet.inOrder?.toString() || "0");

    // Calculate new values
    const newBalance = roundTo8DecimalPlaces(currentBalance + balanceChange);
    const newInOrder = roundTo8DecimalPlaces(currentInOrder + inOrderChange);

    // Validation: balance can't go negative
    if (newBalance < 0) {
      throw new Error(
        `Insufficient balance for ${operation}: current=${currentBalance}, change=${balanceChange}, would be=${newBalance}`
      );
    }

    // Validation: inOrder can't go negative
    if (newInOrder < 0) {
      throw new Error(
        `Insufficient locked funds for ${operation}: current inOrder=${currentInOrder}, change=${inOrderChange}, would be=${newInOrder}`
      );
    }

    await models.wallet.update(
      {
        balance: newBalance,
        inOrder: newInOrder,
      },
      {
        where: { id: wallet.id },
      }
    );
  } catch (error) {
    logger.error("WALLET", "Failed to update wallet for fill", error);
    throw error;
  }
}
