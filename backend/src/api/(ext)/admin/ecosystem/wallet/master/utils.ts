import * as fs from "fs";
import {
  createUTXOWallet,
  fetchUTXOWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/utxo";
import { decrypt, encrypt } from "@b/utils/encrypt";
import {
  baseStringSchema,
  baseEnumSchema,
  baseNumberSchema,
} from "@b/utils/schema";
import { ContractFactory, ethers } from "ethers";
import { RedisSingleton } from "@b/utils/redis";
import { differenceInMinutes } from "date-fns";
import { getAdjustedGasPrice } from "@b/api/(ext)/ecosystem/utils/gas";
import { models } from "@b/db";
import { getProvider } from "@b/api/(ext)/ecosystem/utils/provider";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";
import { getSmartContract } from "@b/api/(ext)/ecosystem/utils/smartContract";
import { walletResponseAttributes } from "@b/api/(ext)/ecosystem/utils/wallet";
import { getSolanaService, getTronService, getMoneroService, getTonService } from "@b/utils/safe-imports";
import path from "path";

// Fetch all master wallets
export async function getAllMasterWallets(): Promise<
  ecosystemMasterWalletAttributes[]
> {
  return models.ecosystemMasterWallet.findAll({
    attributes: walletResponseAttributes,
  });
}

// Fetch a single master wallet by ID
export async function getMasterWalletById(
  id: string
): Promise<ecosystemMasterWalletAttributes | null> {
  return models.ecosystemMasterWallet.findOne({
    where: { id },
    attributes: walletResponseAttributes,
  });
}

// Fetch a single master wallet by UUID (no select constraint)
export async function getMasterWallet(
  id: string
): Promise<ecosystemMasterWalletAttributes | null> {
  return models.ecosystemMasterWallet.findOne({
    where: { id },
  });
}

// Create a new master wallet
export async function createMasterWallet(
  walletData: Web3WalletData,
  currency: string
): Promise<ecosystemMasterWalletCreationAttributes> {
  const wallet = await models.ecosystemMasterWallet.create({
    currency,
    chain: walletData.chain,
    address: walletData.address,
    data: walletData.data,
    status: true,
  });

  return wallet;
}

// Update master wallet balance
export async function updateMasterWalletBalance(
  id: string,
  balance: number
): Promise<ecosystemMasterWalletAttributes | null> {
  await models.ecosystemMasterWallet.update(
    {
      balance,
    },
    {
      where: { id },
    }
  );

  return getMasterWalletById(id);
}

const id = baseStringSchema("ID of the ecosystem master wallet");
const chain = baseStringSchema(
  "Blockchain chain associated with the master wallet",
  255
);
const currency = baseStringSchema("Currency used in the master wallet", 255);
const address = baseStringSchema("Address of the master wallet", 255);
const balance = baseNumberSchema("Balance of the master wallet");
const data = baseStringSchema(
  "Additional data associated with the master wallet",
  1000,
  0,
  true
);
const status = baseEnumSchema("Operational status of the master wallet", [
  "ACTIVE",
  "INACTIVE",
]);
const lastIndex = baseNumberSchema(
  "Last index used for generating wallet address"
);

export const ecosystemMasterWalletSchema = {
  id,
  chain,
  currency,
  address,
  balance,
  data,
  status,
  lastIndex,
};

export const baseEcosystemMasterWalletSchema = {
  id,
  chain,
  currency,
  address,
  balance,
  data,
  status,
  lastIndex,
};

export const ecosystemMasterWalletUpdateSchema = {
  type: "object",
  properties: {
    chain,
    currency,
    address,
    balance,
    data,
    status,
    lastIndex,
  },
  required: ["chain", "currency", "address", "status", "lastIndex"],
};

export const ecosystemMasterWalletStoreSchema = {
  description: `Master wallet created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseEcosystemMasterWalletSchema,
      },
    },
  },
};

export const createAndEncryptWallet = async (
  chain: string
): Promise<Web3WalletData> => {
  let wallet;

  if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
    // Generate a UTXO wallet
    wallet = createUTXOWallet(chain);
  } else if (chain === "SOL") {
    const SolanaService = await getSolanaService();
    if (!SolanaService) {
      throw new Error("Solana service not available");
    }
    const solanaService = await SolanaService.getInstance();
    wallet = solanaService.createWallet();
  } else if (chain === "TRON") {
    const TronService = await getTronService();
    if (!TronService) {
      throw new Error("Tron service not available");
    }
    const tronService = await TronService.getInstance();
    wallet = tronService.createWallet();
  } else if (chain === "XMR") {
    const MoneroService = await getMoneroService();
    if (!MoneroService) {
      throw new Error("Monero service not available");
    }
    const moneroService = await MoneroService.getInstance();
    wallet = await moneroService.createWallet("master_wallet");
  } else if (chain === "TON") {
    const TonService = await getTonService();
    if (!TonService) {
      throw new Error("TON service not available");
    }
    const tonService = await TonService.getInstance();
    wallet = await tonService.createWallet();
  } else {
    // Generate an EVM wallet
    wallet = createEVMWallet();
  }

  // Define the directory and file path with fallback for different environments
  const possibleWalletDirs = [
    path.resolve(process.cwd(), "backend", "ecosystem", "wallets"),    // Production path (PRIORITY)
    path.resolve(__dirname, "../../../../../ecosystem", "wallets"),    // Development relative path
    path.resolve(process.cwd(), "ecosystem", "wallets"),              // Alternative if running from backend dir
    path.resolve(__dirname, "../../../../ecosystem", "wallets"),      // Another relative fallback
  ];
  
  let walletDir = possibleWalletDirs[0];
  
  // Try to find an existing directory or use the first path for creation
  for (const possibleDir of possibleWalletDirs) {
    const parentDir = path.dirname(possibleDir);
    if (fs.existsSync(parentDir)) {
      walletDir = possibleDir;
      console.log(`Using wallet directory: ${walletDir}`);
      break;
    }
  }
  
  const walletFilePath = `${walletDir}/${chain}.json`;

  // Check if directory exists, if not create it
  if (!fs.existsSync(walletDir)) {
    fs.mkdirSync(walletDir, { recursive: true });
  }
  await fs.writeFileSync(walletFilePath, JSON.stringify(wallet), "utf8");

  // Encrypt all the wallet details
  const data = encrypt(JSON.stringify(wallet.data));

  return {
    address: wallet.address,
    chain,
    data,
  };
};

export const createEVMWallet = () => {
  // Generate a random wallet
  const wallet = ethers.Wallet.createRandom();

  if (!wallet.mnemonic) {
    throw new Error("Mnemonic not found");
  }

  // Derive the HDNode from the wallet's mnemonic
  const hdNode = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic.phrase);

  if (!hdNode) {
    throw new Error("HDNode not found");
  }

  const xprv = hdNode.extendedKey;
  const xpub = hdNode.neuter().extendedKey;

  if (!hdNode.mnemonic) {
    throw new Error("Mnemonic not found");
  }

  const mnemonic = hdNode.mnemonic.phrase;
  const address = hdNode.address;
  const publicKey = hdNode.publicKey;
  const privateKey = hdNode.privateKey;
  const path = hdNode.path;
  const chainCode = hdNode.chainCode;

  return {
    address,
    data: {
      mnemonic,
      publicKey,
      privateKey,
      xprv,
      xpub,
      chainCode,
      path,
    },
  };
};

export const getEcosystemMasterWalletBalance = async (
  wallet: ecosystemMasterWalletAttributes
): Promise<void> => {
  try {
    const cacheKey = `wallet:${wallet.id}:balance`;
    const redis = RedisSingleton.getInstance();
    let cachedBalanceData: any = await redis.get(cacheKey);

    if (cachedBalanceData) {
      if (typeof cachedBalanceData !== "object") {
        cachedBalanceData = JSON.parse(cachedBalanceData);
      }

      const now = new Date();
      const lastUpdated = new Date(cachedBalanceData.timestamp);

      if (
        differenceInMinutes(now, lastUpdated) < 5 &&
        parseFloat(cachedBalanceData.balance) !== 0
      ) {
        return;
      }
    }

    let formattedBalance;
    if (["BTC", "LTC", "DOGE", "DASH"].includes(wallet.chain)) {
      formattedBalance = await fetchUTXOWalletBalance(
        wallet.chain,
        wallet.address
      );
    } else if (wallet.chain === "SOL") {
      const SolanaService = await getSolanaService();
      if (!SolanaService) {
        throw new Error("Solana service not available");
      }
      const solanaService = await SolanaService.getInstance();
      formattedBalance = await solanaService.getBalance(wallet.address);
    } else if (wallet.chain === "TRON") {
      const TronService = await getTronService();
      if (!TronService) {
        throw new Error("Tron service not available");
      }
      const tronService = await TronService.getInstance();
      formattedBalance = await tronService.getBalance(wallet.address);
    } else if (wallet.chain === "XMR") {
      const MoneroService = await getMoneroService();
      if (!MoneroService) {
        throw new Error("Monero service not available");
      }
      const moneroService = await MoneroService.getInstance();
      formattedBalance = await moneroService.getBalance("master_wallet");
    } else if (wallet.chain === "TON") {
      const TonService = await getTonService();
      if (!TonService) {
        throw new Error("TON service not available");
      }
      const tonService = await TonService.getInstance();
      formattedBalance = await tonService.getBalance(wallet.address);
    } else {
      const provider = await getProvider(wallet.chain);

      const balance = await provider.getBalance(wallet.address);

      const decimals = chainConfigs[wallet.chain].decimals;
      formattedBalance = ethers.formatUnits(balance.toString(), decimals);
    }

    if (!formattedBalance || isNaN(parseFloat(formattedBalance))) {
      console.log(
        `Invalid formatted balance for ${wallet.chain} wallet: ${formattedBalance}`
      );
      return;
    }

    if (parseFloat(formattedBalance) === 0) {
      return;
    }

    await updateMasterWalletBalance(wallet.id, parseFloat(formattedBalance));

    const cacheData = {
      balance: formattedBalance,
      timestamp: new Date().toISOString(),
    };

    await redis.setex(cacheKey, 300, JSON.stringify(cacheData));
  } catch (error) {
    console.error(
      `Failed to fetch ${wallet.chain} wallet balance: ${error.message}`
    );
  }
};

export async function deployCustodialContract(
  masterWallet: ecosystemMasterWalletAttributes
): Promise<string | undefined> {
  try {
    // Initialize Ethereum provider
    const provider = await getProvider(masterWallet.chain);
    if (!provider) {
      throw new Error("Provider not initialized");
    }

    // Decrypt mnemonic
    let decryptedData;
    if (!masterWallet.data) {
      throw new Error("Mnemonic not found");
    }
    try {
      decryptedData = JSON.parse(decrypt(masterWallet.data));
    } catch (error) {
      throw new Error(`Failed to decrypt mnemonic: ${error.message}`);
    }
    if (!decryptedData || !decryptedData.privateKey) {
      throw new Error("Decrypted data or Mnemonic not found");
    }
    const { privateKey } = decryptedData;

    // Create a signer
    const signer = new ethers.Wallet(privateKey).connect(provider);

    const { abi, bytecode } = await getSmartContract(
      "wallet",
      "CustodialWalletERC20"
    );
    if (!abi || !bytecode) {
      throw new Error("Smart contract ABI or Bytecode not found");
    }

    // Create Contract Factory
    const custodialWalletFactory = new ContractFactory(abi, bytecode, signer);

    // Fetch adjusted gas price
    const gasPrice = await getAdjustedGasPrice(provider);

    // Deploy the contract with dynamic gas settings
    const custodialWalletContract = await custodialWalletFactory.deploy(
      masterWallet.address,
      {
        gasPrice: gasPrice,
      }
    );

    // Wait for the contract to be deployed
    const response = await custodialWalletContract.waitForDeployment();

    return await response.getAddress();
  } catch (error) {
    throw new Error(error.message);
  }
}
