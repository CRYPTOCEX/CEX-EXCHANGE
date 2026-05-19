// NFT Collection Contract Deployment via Web3

// Chain ID mapping for network switching
const CHAIN_IDS: Record<string, number> = {
  ETH: 1,
  ETHEREUM: 1,
  BSC: 56,
  BINANCE: 56,
  POLYGON: 137,
  MATIC: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  AVALANCHE: 43114,
  AVAX: 43114,
  FANTOM: 250,
  FTM: 250,
  CRONOS: 25,
  CRO: 25,
};

// Chain names for error messages
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  56: "BNB Smart Chain",
  137: "Polygon",
  42161: "Arbitrum One",
  10: "Optimism",
  8453: "Base",
  43114: "Avalanche",
  250: "Fantom",
  25: "Cronos",
};

// Dynamic ABI loading to handle ecosystem extension availability
async function loadABIs() {
  try {
    const [ERC721Response, ERC1155Response] = await Promise.all([
      fetch("/contracts/nft/ERC721NFT.json"),
      fetch("/contracts/nft/ERC1155NFT.json"),
    ]);

    if (!ERC721Response.ok || !ERC1155Response.ok) {
      throw new Error("Contract ABI files not found");
    }

    const [ERC721, ERC1155] = await Promise.all([
      ERC721Response.json(),
      ERC1155Response.json(),
    ]);

    return {
      ERC721_ABI: ERC721,
      ERC1155_ABI: ERC1155,
    };
  } catch (error) {
    console.error("[NFT DEPLOY] Ecosystem extension not installed or ABIs not found");
    throw new Error(
      "NFT deployment requires the Ecosystem extension. Please ensure it is installed and configured."
    );
  }
}

export interface DeploymentParams {
  name: string;
  symbol: string;
  baseTokenURI: string;
  maxSupply: number;
  royaltyPercentage: number; // basis points (250 = 2.5%)
  mintPrice: string; // in ETH
  isPublicMint: boolean;
  standard: "ERC721" | "ERC1155";
  chain: string;
}

export interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deploymentCost: string; // in ETH
}

export async function deployNFTContract(
  params: DeploymentParams
): Promise<DeploymentResult> {
  try {
    console.log("[NFT DEPLOY] Starting deployment:", params);

    // Load ABIs dynamically (will throw error if ecosystem extension not installed)
    const { ERC721_ABI, ERC1155_ABI } = await loadABIs();

    // Get Wagmi config and connector client
    const { config } = await import("@/config/wallet");
    const { getConnectorClient } = await import("wagmi/actions");
    const { ContractFactory, parseEther, Contract } = await import("ethers");
    const { BrowserProvider } = await import("ethers");

    // Get the connected wallet client
    const connectorClient = await getConnectorClient(config);

    if (!connectorClient || !connectorClient.account) {
      throw new Error("No wallet connected. Please connect your wallet.");
    }

    const userAddress = connectorClient.account.address;
    console.log("[NFT DEPLOY] Connected wallet:", userAddress);

    // Get target chain ID from chain parameter
    const targetChainId = CHAIN_IDS[params.chain.toUpperCase()] || 56; // Default to BSC
    const targetChainName = CHAIN_NAMES[targetChainId] || params.chain;
    console.log("[NFT DEPLOY] Target chain:", targetChainName, "Chain ID:", targetChainId);

    // Check current chain and switch if necessary
    const currentChainId = connectorClient.chain?.id;
    console.log("[NFT DEPLOY] Current chain ID:", currentChainId);

    if (currentChainId !== targetChainId) {
      console.log("[NFT DEPLOY] Switching network from", currentChainId, "to", targetChainId);

      try {
        const { switchChain } = await import("wagmi/actions");
        await switchChain(config, { chainId: targetChainId });
        console.log("[NFT DEPLOY] Network switched successfully to", targetChainName);

        // Wait a moment for the switch to complete and get new connector client
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get updated connector client after network switch
        const updatedConnectorClient = await getConnectorClient(config);
        if (updatedConnectorClient.chain?.id !== targetChainId) {
          throw new Error(`Failed to switch to ${targetChainName}. Please switch manually in your wallet.`);
        }
      } catch (switchError: any) {
        console.error("[NFT DEPLOY] Network switch failed:", switchError);

        // Check if user rejected the switch
        if (switchError.code === 4001 || switchError.code === "ACTION_REJECTED") {
          throw new Error(`You must switch to ${targetChainName} to deploy this contract. Please approve the network switch in your wallet.`);
        }

        // Network might not be added to wallet, try to add it
        if (switchError.code === 4902) {
          throw new Error(`${targetChainName} is not configured in your wallet. Please add it manually and try again.`);
        }

        throw new Error(`Failed to switch to ${targetChainName}: ${switchError.message}`);
      }
    }

    // Create ethers provider from Wagmi connector (use updated client after potential network switch)
    const finalConnectorClient = await getConnectorClient(config);
    const provider = new BrowserProvider(finalConnectorClient.transport);
    const signer = await provider.getSigner();

    // Verify we're on the correct network
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== targetChainId) {
      throw new Error(`Network mismatch. Expected ${targetChainName} (${targetChainId}) but got chain ID ${network.chainId}. Please switch networks in your wallet.`);
    }
    console.log("[NFT DEPLOY] Verified on correct network:", network.chainId.toString());

    // Get the appropriate ABI and bytecode
    const contractArtifact = params.standard === "ERC721" ? ERC721_ABI : ERC1155_ABI;
    const abi = contractArtifact.abi;
    const bytecode = contractArtifact.bytecode;

    if (!bytecode) {
      throw new Error("Contract bytecode not found");
    }

    console.log("[NFT DEPLOY] Contract standard:", params.standard);
    console.log("[NFT DEPLOY] Preparing deployment transaction...");

    // Create contract factory
    const factory = new ContractFactory(abi, bytecode, signer);

    // Convert mint price to Wei
    const mintPriceWei = parseEther(params.mintPrice || "0");

    // Prepare constructor arguments
    // Use connected wallet as owner and royalty recipient
    const constructorArgs = [
      params.name,
      params.symbol,
      params.baseTokenURI || "",
      params.maxSupply,
      params.royaltyPercentage,
      userAddress, // royaltyRecipient
      mintPriceWei,
      params.isPublicMint,
      userAddress // owner
    ];

    console.log("[NFT DEPLOY] Constructor args:", constructorArgs);

    // Estimate gas
    const deploymentData = await factory.getDeployTransaction(...constructorArgs);

    console.log("[NFT DEPLOY] Deployment data length:", deploymentData.data?.length);

    let estimatedGas;
    try {
      estimatedGas = await provider.estimateGas({
        data: deploymentData.data,
        from: userAddress
      });
    } catch (gasError: any) {
      console.error("[NFT DEPLOY] Gas estimation failed:", gasError);
      console.error("[NFT DEPLOY] Error details:", {
        message: gasError.message,
        code: gasError.code,
        data: gasError.data,
        reason: gasError.reason
      });
      throw new Error(`Gas estimation failed: ${gasError.message || 'Unknown error'}. The contract deployment will likely fail. Please check your network connection and try again.`);
    }

    console.log("[NFT DEPLOY] Estimated gas:", estimatedGas.toString());

    // Add 50% gas buffer to ensure deployment succeeds
    const gasLimit = (estimatedGas * BigInt(150)) / BigInt(100);
    console.log("[NFT DEPLOY] Gas limit with buffer:", gasLimit.toString());

    // Deploy contract
    console.log("[NFT DEPLOY] Deploying contract... Please sign the transaction in your wallet.");
    const contract = await factory.deploy(...constructorArgs, {
      gasLimit: gasLimit
    });

    console.log("[NFT DEPLOY] Transaction sent:", contract.deploymentTransaction()?.hash);
    console.log("[NFT DEPLOY] Waiting for confirmation...");

    // Wait for deployment to be mined
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();

    if (!deploymentTx) {
      throw new Error("Deployment transaction not found");
    }

    // Get transaction receipt
    const receipt = await deploymentTx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt not found");
    }

    // CRITICAL: Verify transaction actually succeeded on blockchain
    if (receipt.status === 0) {
      console.error("[NFT DEPLOY] Transaction failed on blockchain!");
      throw new Error("Contract deployment failed on blockchain. The transaction was reverted.");
    }

    // Double-check: Verify contract code exists at address
    const deployedCode = await provider.getCode(contractAddress);
    if (!deployedCode || deployedCode === "0x" || deployedCode === "0x0") {
      console.error("[NFT DEPLOY] No contract code at address:", contractAddress);
      throw new Error("Contract deployment verification failed: No code found at contract address. The deployment may have been reverted.");
    }

    console.log("[NFT DEPLOY] ✅ Contract deployed successfully!");
    console.log("[NFT DEPLOY] Contract address:", contractAddress);
    console.log("[NFT DEPLOY] Block number:", receipt.blockNumber);
    console.log("[NFT DEPLOY] Contract code verified:", deployedCode.substring(0, 66) + "...");

    // IMPORTANT: Enable public minting by default after deployment
    console.log("[NFT DEPLOY] Enabling public minting...");
    try {
      const deployedContract = new Contract(contractAddress, abi, signer);
      const enableTx = await deployedContract.togglePublicMint(true);
      console.log("[NFT DEPLOY] Public mint enable transaction sent:", enableTx.hash);
      await enableTx.wait();
      console.log("[NFT DEPLOY] ✅ Public minting enabled!");
    } catch (enableError: any) {
      console.error("[NFT DEPLOY] Failed to enable public minting:", enableError);
      console.warn("[NFT DEPLOY] ⚠️ Public minting is DISABLED. You must enable it manually before users can mint.");
      // Don't throw error - deployment succeeded, just public mint failed
    }

    // Calculate deployment cost
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.gasPrice || deploymentTx.gasPrice;
    const deploymentCost = (gasUsed * effectiveGasPrice) / BigInt(10 ** 18);

    const result: DeploymentResult = {
      contractAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: gasUsed.toString(),
      deploymentCost: deploymentCost.toString()
    };

    console.log("[NFT DEPLOY] Deployment result:", result);

    return result;
  } catch (error: any) {
    console.error("[NFT DEPLOY] Deployment failed:", error);

    // Handle specific errors
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
      throw new Error("Transaction rejected by user");
    }

    if (error.code === "INSUFFICIENT_FUNDS") {
      throw new Error("Insufficient funds to deploy contract");
    }

    if (error.code === "NETWORK_ERROR") {
      throw new Error("Network error. Please check your connection.");
    }

    throw new Error(error.message || "Failed to deploy contract");
  }
}
