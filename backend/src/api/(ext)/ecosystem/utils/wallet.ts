import { models, sequelize } from "@b/db";
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
import { logError } from "@b/utils/logger";


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

export async function getWalletByUserIdAndCurrency(userId, currency) {
  let generated = false;

  // Step 1: Fetch the wallet for the specified user and currency.
  let wallet = await models.wallet.findOne({
    where: {
      userId,
      currency,
      type: "ECO",
    },
    attributes: ["id", "type", "currency", "balance", "address"],
  });

  // Step 2: If no wallet is found, generate a new wallet.
  if (!wallet) {
    wallet = await storeWallet({ id: userId }, currency);
    generated = true;
  }

  // Step 3: If wallet is still not found after attempting creation, throw an error.
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
    console.error(`[ERROR] Failed to parse wallet address for wallet ${wallet.id}:`, error.message);
    console.error(`[ERROR] Raw address value:`, wallet.address);

    // Try to repair common JSON errors
    if (typeof wallet.address === "string") {
      try {
        // Fix missing colons (e.g., "balance"0.123 -> "balance":0.123)
        const repairedAddress = wallet.address.replace(/"(\w+)"(\d+\.?\d*)/g, '"$1":$2');
        addresses = JSON.parse(repairedAddress);
        console.log(`[SUCCESS] Repaired corrupted wallet address JSON for wallet ${wallet.id}`);

        // Save the repaired address back to database
        await models.wallet.update(
          { address: JSON.stringify(addresses) },
          { where: { id: wallet.id } }
        );
      } catch (repairError) {
        console.error(`[ERROR] Failed to repair wallet address:`, repairError.message);
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
  console.error(message);
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
    console.warn(
      `Skipping chain ${token.chain} - Master wallet not found or not enabled`
    );
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
    logError("wallet", error, __filename);
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
    logError("wallet", error, __filename);
    throw error;
  }
}

export async function checkEcosystemAvailableFunds(
  userWallet,
  walletData,
  totalAmount
) {
  try {
    console.log(`[WALLET] Checking funds availability:`, {
      walletId: userWallet.id,
      totalAmount,
      currentBalance: userWallet.balance
    });

    const totalAvailable = await getTotalAvailable(userWallet, walletData);
    console.log(`[WALLET] Total available: ${totalAvailable}`);

    if (totalAvailable < totalAmount) {
      console.error(`[WALLET] Insufficient funds: available ${totalAvailable} < required ${totalAmount}`);
      throw new Error("Insufficient funds for withdrawal including fee");
    }

    return totalAvailable;
  } catch (error) {
    console.error(`[WALLET] Error checking funds:`, error);
    logError("wallet", error, __filename);
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
    console.log(`[WALLET] Getting gas payer for chain: ${chain}`);
    const masterWallet = await getMasterWalletByChainFull(chain);
    if (!masterWallet) {
      console.error(`[WALLET] Master wallet not found for chain: ${chain}`);
      throw new Error("Master wallet not found");
    }
    const { data } = masterWallet;
    if (!data) {
      console.error(`[WALLET] Master wallet data not found for chain: ${chain}`);
      throw new Error("Master wallet data not found");
    }
    console.log(`[WALLET] Decrypting master wallet data`);
    const decryptedMasterData = JSON.parse(decrypt(data));
    return new ethers.Wallet(decryptedMasterData.privateKey, provider);
  } catch (error) {
    console.error(`[WALLET] Error getting gas payer:`, error);
    logError("wallet", error, __filename);
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
    logError("wallet", error, __filename);
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
    logError("contract", error, __filename);
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
    logError("contract", error, __filename);
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
    logError("contract", error, __filename);
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
    logError("wallet", error, __filename);
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
    logError("contract", error, __filename);
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
    logError("wallet", error, __filename);
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
    logError("wallet", error, __filename);
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
    logError("wallet", error, __filename);
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
    logError("wallet", error, __filename);
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
    logError("wallet", error, __filename);
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
    console.log(`[DEPOSIT_DEBUG] Processing deposit for wallet ${wallet.id}`);
    console.log(`[DEPOSIT_DEBUG] Current wallet balance: ${wallet.balance} ${wallet.currency}`);
    console.log(`[DEPOSIT_DEBUG] Current chain balance: ${chainAddress.balance || 0} ${wallet.currency}`);
    console.log(`[DEPOSIT_DEBUG] Deposit amount (trx.amount): ${trx.amount} ${wallet.currency}`);
    console.log(`[DEPOSIT_DEBUG] Parsed deposit amount: ${depositAmount} ${wallet.currency}`);

    chainAddress.balance = (chainAddress.balance || 0) + depositAmount;
    const walletBalance = wallet.balance + depositAmount;

    console.log(`[DEPOSIT_DEBUG] New chain balance: ${chainAddress.balance} ${wallet.currency}`);
    console.log(`[DEPOSIT_DEBUG] New wallet balance: ${walletBalance} ${wallet.currency}`);

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

    const updatedWallet = await models.wallet.findOne({
      where: { id: wallet.id },
    });

    await models.walletData.update(
      {
        balance: sequelize.literal(`balance + ${trx.amount}`),
      },
      {
        where: {
          walletId: wallet.id,
          chain: trx.chain,
        },
      }
    );

    return {
      transaction: createdTransaction,
      wallet: updatedWallet,
    };
  } catch (error) {
    logError("wallet", error, __filename);
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
      await models.ecosystemPrivateLedger.update(
        {
          offchainDifference: sequelize.literal(
            `offchain_difference + ${difference}`
          ),
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
        offchainDifference: difference,
        network: networkValue,
      });
    }
  } catch (error) {
    logError("ledger", error, __filename);
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
  };

  if (fixedPrecisionChains[chain] !== undefined) {
    return parseFloat(balance.toFixed(fixedPrecisionChains[chain]));
  }
  return balance;
};

export const decrementWalletBalance = async (userWallet, chain, amount) => {
  try {
    let newBalance = userWallet.balance - amount;
    newBalance = updateBalancePrecision(newBalance, chain);

    const addresses = JSON.parse(userWallet.address);
    if (addresses[chain]) {
      addresses[chain].balance = updateBalancePrecision(
        addresses[chain].balance - amount,
        chain
      );
    } else {
      throw new Error(
        `Chain ${chain} not found in the user's wallet addresses.`
      );
    }

    await models.wallet.update(
      {
        balance: newBalance,
        address: JSON.stringify(addresses) as any,
      },
      {
        where: { id: userWallet.id },
      }
    );
  } catch (error) {
    logError("wallet", error, __filename);
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
  token
) {
  try {
    return await models.transaction.create({
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
    });
  } catch (error) {
    logError("transaction", error, __filename);
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
    if (metadata?.chain && addresses[metadata?.chain]) {
      addresses[metadata?.chain].balance += amount;
    }
    const walletBalance = wallet.balance + amount;

    await models.wallet.update(
      {
        balance: walletBalance,
        address: JSON.stringify(addresses) as any,
      },
      {
        where: { id: wallet.id },
      }
    );
  } catch (error) {
    logError("wallet", error, __filename);
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

    await models.walletData.update(
      {
        balance: sequelize.literal(`balance - ${amount}`),
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
    logError("wallet", error, __filename);
    throw error;
  }
};

export async function updateWalletBalance(
  wallet: walletAttributes,
  balanceChange: number,
  type: "add" | "subtract"
): Promise<void> {
  try {
    if (!wallet) throw new Error("Wallet not found");

    let newBalance: number;

    const roundTo4DecimalPlaces = (num: number) =>
      Math.round((num + Number.EPSILON) * 1e8) / 1e8;

    switch (type) {
      case "add":
        newBalance = roundTo4DecimalPlaces(wallet.balance + balanceChange);
        break;
      case "subtract":
        newBalance = roundTo4DecimalPlaces(wallet.balance - balanceChange);
        if (newBalance < 0) {
          throw new Error("Insufficient funds");
        }
        break;
      default:
        throw new Error("Invalid type specified for updating wallet balance.");
    }

    await models.wallet.update(
      {
        balance: newBalance,
      },
      {
        where: { id: wallet.id },
      }
    );
  } catch (error) {
    logError("wallet", error, __filename);
    throw error;
  }
}
