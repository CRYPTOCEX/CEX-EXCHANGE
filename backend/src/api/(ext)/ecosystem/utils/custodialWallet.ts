import { ContractFactory, ethers, isError } from "ethers";
import { getSmartContract } from "./smartContract";
import { getProvider } from "./provider";
import { decrypt } from "../../../../utils/encrypt";
import { getAdjustedGasPrice } from "./gas";
import { models } from "@b/db";
import { logError } from "@b/utils/logger";

export async function getCustodialWalletBalances(
  contract,
  tokens,
  format: boolean = true
) {
  try {
    const tokensAddresses = tokens.map((token) => token.contract);
    const [nativeBalance, tokenBalances] =
      await contract.getAllBalances(tokensAddresses);
    const balances = tokenBalances.map((balance, index) => ({
      ...tokens[index],
      balance: format
        ? ethers.formatUnits(balance, tokens[index].decimals)
        : balance,
    }));

    const native = format ? ethers.formatEther(nativeBalance) : nativeBalance;
    return { balances, native };
  } catch (error) {
    logError("custodial_wallet", error, __filename);
    throw new Error(
      `Failed to get custodial wallet balances: ${error.message}`
    );
  }
}

export async function getCustodialWalletTokenBalance(
  contract,
  tokenContractAddress
) {
  try {
    return await contract.getTokenBalance(tokenContractAddress);
  } catch (error) {
    logError("custodial_wallet", error, __filename);
    throw new Error(`Failed to get token balance: ${error.message}`);
  }
}

export async function getCustodialWalletNativeBalance(contract) {
  try {
    return await contract.getNativeBalance();
  } catch (error) {
    logError("custodial_wallet", error, __filename);
    throw new Error(`Failed to get native balance: ${error.message}`);
  }
}

export async function getCustodialWalletContract(
  address: string,
  provider: any
) {
  try {
    const { abi } = await getSmartContract("wallet", "CustodialWalletERC20");
    if (!abi) {
      throw new Error("Smart contract ABI or Bytecode not found");
    }

    return new ethers.Contract(address, abi, provider);
  } catch (error) {
    logError("custodial_wallet", error, __filename);
    throw new Error(
      `Failed to get custodial wallet contract: ${error.message}`
    );
  }
}

export async function deployCustodialContract(
  masterWallet: EcosystemMasterWallet
): Promise<string | undefined> {
  try {
    const provider = await getProvider(masterWallet.chain);
    if (!provider) {
      throw new Error("Provider not initialized");
    }

    let decryptedData;
    try {
      decryptedData = JSON.parse(decrypt(masterWallet.data));
    } catch (error) {
      throw new Error(`Failed to decrypt mnemonic: ${error.message}`);
    }
    if (!decryptedData || !decryptedData.privateKey) {
      throw new Error("Decrypted data or Mnemonic not found");
    }
    const { privateKey } = decryptedData;

    const signer = new ethers.Wallet(privateKey).connect(provider);

    const { abi, bytecode } = await getSmartContract(
      "wallet",
      "CustodialWalletERC20"
    );
    if (!abi || !bytecode) {
      throw new Error("Smart contract ABI or Bytecode not found");
    }

    const custodialWalletFactory = new ContractFactory(abi, bytecode, signer);
    const gasPrice = await getAdjustedGasPrice(provider);

    const custodialWalletContract = await custodialWalletFactory.deploy(
      masterWallet.address,
      {
        gasPrice: gasPrice,
      }
    );

    const response = await custodialWalletContract.waitForDeployment();

    return await response.getAddress();
  } catch (error: any) {
    logError("custodial_wallet_deployment", error, __filename);
    if (isError(error, "INSUFFICIENT_FUNDS")) {
      throw new Error("Not enough funds to deploy the contract");
    }
    throw new Error(error.message);
  }
}

export async function getActiveCustodialWallets(
  chain
): Promise<ecosystemCustodialWalletAttributes[]> {
  try {
    const wallet = await models.ecosystemCustodialWallet.findAll({
      where: {
        chain: chain,
        status: true,
      },
    });

    if (!wallet) {
      throw new Error("No active custodial wallets found");
    }

    return wallet;
  } catch (error) {
    logError("custodial_wallet", error, __filename);
    throw new Error(`Failed to get active custodial wallets: ${error.message}`);
  }
}
