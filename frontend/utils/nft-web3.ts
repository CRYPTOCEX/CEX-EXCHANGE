import { ethers } from "ethers";
import { ERC721_NFT_ABI } from "./nft-abis";

export interface MintTransactionParams {
  contractAddress: string;
  recipientAddress: string;
  tokenURI: string; // Metadata URI (IPFS or image URL)
  mintPrice: string; // in ETH
  chain: string;
}

export interface MintTransactionResult {
  success: boolean;
  transactionHash?: string;
  tokenId?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

/**
 * Prepare and send NFT mint transaction via user's Web3 wallet
 * Supports both MetaMask and WalletConnect via Reown AppKit
 * This implements true Web3 flow where users sign their own transactions
 */
export async function mintNFTViaWeb3(
  params: MintTransactionParams
): Promise<MintTransactionResult> {
  try {
    const { contractAddress, recipientAddress, tokenURI, mintPrice, chain } = params;

    // Get provider from Wagmi config
    const { config } = await import("@/config/wallet");
    const { getConnectorClient } = await import("wagmi/actions");
    const { BrowserProvider } = await import("ethers");

    // Get the connected wallet client from Wagmi
    const connectorClient = await getConnectorClient(config);

    if (!connectorClient || !connectorClient.account) {
      throw new Error("No wallet provider found. Please connect your wallet.");
    }

    const userAddress = connectorClient.account.address;

    // Verify the recipient address matches the connected wallet
    if (recipientAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Recipient address must match connected wallet address.");
    }

    // Create ethers provider from Wagmi connector
    const provider = new BrowserProvider(connectorClient.transport);
    const signer = await provider.getSigner();

    // Create contract instance
    const nftContract = new ethers.Contract(
      contractAddress,
      ERC721_NFT_ABI,
      signer
    );

    // Check if collection has reached max supply
    try {
      const [totalSupply, maxSupply, isPublicMint] = await Promise.all([
        nftContract.totalSupply(),
        nftContract.maxSupply(),
        nftContract.isPublicMint()
      ]);

      const totalSupplyNum = Number(totalSupply.toString());
      const maxSupplyNum = Number(maxSupply.toString());

      console.log("[NFT MINT] Collection stats:", {
        totalSupply: totalSupplyNum,
        maxSupply: maxSupplyNum,
        isPublicMint,
        contractAddress,
        remaining: maxSupplyNum > 0 ? maxSupplyNum - totalSupplyNum : 'unlimited'
      });

      // Check if public minting is allowed
      if (!isPublicMint) {
        throw new Error(
          "Public minting is not enabled for this collection. " +
          "The collection owner needs to enable public minting. " +
          "Please contact the collection owner or check if you need to be whitelisted."
        );
      }

      // Check if max supply reached
      if (maxSupplyNum > 0 && totalSupplyNum >= maxSupplyNum) {
        throw new Error(
          `This collection has reached its maximum supply. ` +
          `Current: ${totalSupplyNum} / ${maxSupplyNum}. ` +
          `No more NFTs can be minted in this collection. ` +
          `You may need to create a new collection or increase the max supply.`
        );
      }

    } catch (error: any) {
      // If it's a collection limit error, re-throw it
      if (error.message?.includes("maximum supply") || error.message?.includes("not enabled")) {
        throw error;
      }
      // Otherwise, just log and continue (contract might not have these functions)
      console.warn("[NFT MINT] Could not check collection limits:", error.message);
    }

    // Prepare transaction options
    const txOptions: any = {};

    // Add mint price if required
    if (mintPrice && parseFloat(mintPrice) > 0) {
      txOptions.value = ethers.parseEther(mintPrice);
    }

    console.log("[NFT MINT] ========== MINT DETAILS ==========");
    console.log("[NFT MINT] Contract Address:", contractAddress);
    console.log("[NFT MINT] Token URI:", tokenURI);
    console.log("[NFT MINT] Mint Price:", mintPrice);
    console.log("[NFT MINT] Chain:", chain);
    console.log("[NFT MINT] Token URI Length:", tokenURI.length);
    console.log("[NFT MINT] Token URI Type:", typeof tokenURI);
    console.log("[NFT MINT] Is Valid IPFS?:", tokenURI.includes('ipfs'));
    console.log("[NFT MINT] ======================================");

    // Estimate gas
    try {
      const gasEstimate = await nftContract.mint.estimateGas(
        tokenURI,
        txOptions
      );
      // Add 20% buffer to gas estimate
      txOptions.gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);
      console.log("[NFT MINT] Gas estimate:", gasEstimate.toString());
    } catch (gasError: any) {
      console.error("[NFT MINT] ========== GAS ESTIMATION ERROR ==========");
      console.error("[NFT MINT] Error object:", gasError);
      console.error("[NFT MINT] Error message:", gasError.message);
      console.error("[NFT MINT] Error code:", gasError.code);
      console.error("[NFT MINT] Error reason:", gasError.reason);
      console.error("[NFT MINT] Error data:", gasError.data);
      console.error("[NFT MINT] =======================================");

      // Check for specific errors
      if (gasError.message?.includes("token already minted")) {
        throw new Error(
          "⚠️ This NFT metadata has already been used in this collection.\n\n" +
          "Each NFT must have a unique metadata URI or name. This could happen if:\n" +
          "• You've already minted an NFT with the same IPFS URL\n" +
          "• The metadata contains a duplicate name\n" +
          "• Another NFT in this collection uses the same tokenURI\n\n" +
          "Solution: Upload a new image to IPFS or use a different name for your NFT."
        );
      }

      if (gasError.message?.includes("insufficient funds")) {
        throw new Error(
          "💰 Insufficient funds to mint this NFT.\n\n" +
          "You don't have enough cryptocurrency in your wallet to cover the gas fees.\n\n" +
          "Solution: Add more funds to your wallet and try again."
        );
      }

      if (gasError.message?.includes("Minting not allowed") || gasError.message?.includes("execution reverted")) {
        throw new Error(
          "🔒 Public minting is not enabled for this collection.\n\n" +
          "You need to enable public minting on the smart contract first.\n\n" +
          "Solution:\n" +
          "1. Go to your collection settings\n" +
          "2. Call the 'Enable Public Mint' function (requires contract owner)\n" +
          "3. Or use a blockchain explorer to call togglePublicMint(true)\n\n" +
          "Alternative: Deploy a new collection with public minting enabled by default."
        );
      }

      if (gasError.message?.includes("Max supply reached")) {
        throw new Error(
          "📦 This collection has reached its maximum supply.\n\n" +
          "No more NFTs can be minted in this collection.\n\n" +
          "Solution: Create a new collection or select a different one."
        );
      }

      if (gasError.message?.includes("execution reverted")) {
        // Extract the revert reason if available
        const revertReason = gasError.reason || gasError.message;
        throw new Error(
          `❌ Transaction will fail: ${revertReason}\n\n` +
          "MetaMask detected that this transaction will fail on the blockchain.\n\n" +
          "Common causes:\n" +
          "• Duplicate NFT name or metadata\n" +
          "• Collection is full\n" +
          "• Public minting disabled\n" +
          "• Insufficient balance for gas fees"
        );
      }

      // For other gas estimation errors, throw a user-friendly message
      throw new Error(
        "⚠️ Unable to estimate gas for this transaction.\n\n" +
        "MetaMask detected a potential issue. Please verify:\n" +
        "1. You have enough funds for gas fees\n" +
        "2. Your NFT name/metadata is unique\n" +
        "3. The collection contract is valid\n" +
        "4. Public minting is enabled"
      );
    }

    // Send transaction - this will prompt MetaMask for user signature
    console.log("[NFT MINT] Requesting user signature...");
    const tx = await nftContract.mint(tokenURI, txOptions);

    console.log("[NFT MINT] Transaction sent:", tx.hash);
    console.log("[NFT MINT] Waiting for confirmation...");

    // Wait for transaction confirmation with timeout
    let receipt;
    try {
      // Add timeout wrapper to prevent infinite hanging
      const WAIT_TIMEOUT = 60000; // 60 seconds
      const waitPromise = tx.wait();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), WAIT_TIMEOUT)
      );

      receipt = await Promise.race([waitPromise, timeoutPromise]) as any;
    } catch (waitError: any) {
      console.error("[NFT MINT] Error waiting for transaction:", waitError);
      console.error("[NFT MINT] Wait error code:", waitError.code);
      console.error("[NFT MINT] Wait error message:", waitError.message);

      // Check if it's a timeout or RPC error
      if (waitError.message?.includes('timeout')) {
        console.log("[NFT MINT] Timeout reached, fetching receipt manually...");
      }

      // Try to fetch the receipt manually
      if (tx.hash) {
        console.log("[NFT MINT] Attempting to fetch receipt manually...");
        const provider = new ethers.BrowserProvider((window as any).ethereum);

        // Try up to 3 times with delay
        let attempts = 0;
        while (attempts < 3 && !receipt) {
          attempts++;
          console.log(`[NFT MINT] Fetch attempt ${attempts}/3...`);

          receipt = await provider.getTransactionReceipt(tx.hash);

          if (!receipt && attempts < 3) {
            // Wait 2 seconds before next attempt
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (!receipt) {
          // Transaction might still be pending
          return {
            success: false,
            error:
              "⚠️ Transaction confirmation timeout.\n\n" +
              `Transaction hash: ${tx.hash}\n\n` +
              "The transaction was sent but we couldn't confirm it.\n" +
              "This could mean:\n" +
              "• Network congestion (transaction still pending)\n" +
              "• RPC node error (transaction may have failed)\n\n" +
              "Please check BSCScan to see the actual status:\n" +
              `https://bscscan.com/tx/${tx.hash}\n\n` +
              "If the transaction succeeded on BSCScan, you can manually record it in your collection."
          };
        }
      } else {
        return {
          success: false,
          error: waitError.message || "Transaction failed before being sent"
        };
      }
    }

    if (!receipt) {
      throw new Error("Transaction receipt not found after waiting");
    }

    console.log("[NFT MINT] Receipt received:", receipt);
    console.log("[NFT MINT] Receipt status:", receipt.status);

    // Check if transaction was successful
    if (receipt.status === 0) {
      console.error("[NFT MINT] Transaction failed on blockchain");
      throw new Error(
        "❌ Transaction failed on blockchain!\n\n" +
        "The smart contract reverted the transaction.\n\n" +
        "Common reasons:\n" +
        "• Duplicate tokenURI (this IPFS URL was already minted)\n" +
        "• Max supply reached (collection is full)\n" +
        "• Public minting not enabled (check collection settings)\n" +
        "• Insufficient payment (check mint price)\n\n" +
        `Check the transaction on BSCScan:\n` +
        `https://bscscan.com/tx/${receipt.hash}`
      );
    }

    console.log("[NFT MINT] Transaction confirmed in block:", receipt.blockNumber);

    // Extract token ID from Transfer event logs
    let tokenId: string | undefined;
    const transferEventTopic = ethers.id("Transfer(address,address,uint256)");

    for (const log of receipt.logs) {
      if (log.topics[0] === transferEventTopic) {
        // Token ID is the third topic in Transfer event
        tokenId = BigInt(log.topics[3]).toString();
        console.log("[NFT MINT] Token ID extracted from logs:", tokenId);
        break;
      }
    }

    // CRITICAL: Verify the NFT was actually minted on-chain
    if (!tokenId) {
      console.error("[NFT MINT] No Transfer event found in receipt logs");
      throw new Error("NFT minting verification failed: No Transfer event found. The NFT may not have been minted.");
    }

    // Double-check: Verify the token exists on-chain
    try {
      const tokenOwner = await nftContract.ownerOf(tokenId);
      console.log("[NFT MINT] ✅ Verified on-chain - Token owner:", tokenOwner);

      if (tokenOwner.toLowerCase() !== recipientAddress.toLowerCase()) {
        console.error("[NFT MINT] Owner mismatch:", tokenOwner, "vs", recipientAddress);
        throw new Error("NFT ownership verification failed: Token exists but owner doesn't match.");
      }
    } catch (verifyError: any) {
      console.error("[NFT MINT] On-chain verification failed:", verifyError);
      throw new Error(`NFT verification failed: ${verifyError.message || 'Could not verify token on blockchain'}`);
    }

    // Calculate gas cost
    const gasUsed = receipt.gasUsed;
    const gasPrice = tx.gasPrice || receipt.gasPrice || BigInt(0);
    const gasCost = gasUsed * gasPrice;
    const gasCostEth = ethers.formatEther(gasCost);

    console.log("[NFT MINT] Gas used:", gasUsed.toString());
    console.log("[NFT MINT] Gas cost:", gasCostEth, "ETH");

    return {
      success: true,
      transactionHash: receipt.hash,
      tokenId,
      blockNumber: receipt.blockNumber,
      gasUsed: gasUsed.toString(),
    };
  } catch (error: any) {
    console.error("[NFT MINT] Error:", error);

    // Handle user rejection
    if (error.code === 4001 || error.code === "ACTION_REJECTED") {
      return {
        success: false,
        error: "Transaction was rejected by user",
      };
    }

    // Handle insufficient funds
    if (
      error.code === "INSUFFICIENT_FUNDS" ||
      error.message?.includes("insufficient funds")
    ) {
      return {
        success: false,
        error: "Insufficient funds to complete the transaction",
      };
    }

    // Handle gas estimation errors
    if (
      error.code === "UNPREDICTABLE_GAS_LIMIT" ||
      error.message?.includes("gas")
    ) {
      return {
        success: false,
        error: "Gas estimation failed. Please check contract state or try again.",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to mint NFT",
    };
  }
}

/**
 * Get current gas price for the connected network
 */
export async function getCurrentGasPrice(): Promise<string | null> {
  try {
    // Get provider from wallet store
    const { useWalletStore } = await import("@/store/nft/wallet-store");
    const walletStore = useWalletStore.getState();
    const walletProvider = await walletStore.getProvider();

    if (!walletProvider) {
      return null;
    }

    const provider = new ethers.BrowserProvider(walletProvider);
    const feeData = await provider.getFeeData();

    if (feeData.gasPrice) {
      return ethers.formatUnits(feeData.gasPrice, "gwei");
    }

    return null;
  } catch (error) {
    console.error("[GAS PRICE] Error fetching gas price:", error);
    return null;
  }
}

/**
 * Estimate gas cost for minting an NFT
 */
export async function estimateMintGasCost(
  contractAddress: string,
  recipientAddress: string,
  mintPrice: string
): Promise<{
  gasLimit: string;
  gasPrice: string;
  totalCost: string;
  totalCostEth: string;
} | null> {
  try {
    // Get provider from wallet store
    const { useWalletStore } = await import("@/store/nft/wallet-store");
    const walletStore = useWalletStore.getState();
    const walletProvider = await walletStore.getProvider();

    if (!walletProvider) {
      return null;
    }

    const provider = new ethers.BrowserProvider(walletProvider);
    const signer = await provider.getSigner();

    const nftContract = new ethers.Contract(
      contractAddress,
      ERC721_NFT_ABI,
      signer
    );

    const txOptions: any = {};
    if (mintPrice && parseFloat(mintPrice) > 0) {
      txOptions.value = ethers.parseEther(mintPrice);
    }

    // Estimate gas
    const gasEstimate = await nftContract.mint.estimateGas(
      recipientAddress,
      txOptions
    );

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);

    // Calculate total cost (gas + mint price)
    const gasCost = gasEstimate * gasPrice;
    const mintCost = txOptions.value || BigInt(0);
    const totalCost = gasCost + mintCost;

    return {
      gasLimit: gasEstimate.toString(),
      gasPrice: ethers.formatUnits(gasPrice, "gwei"),
      totalCost: totalCost.toString(),
      totalCostEth: ethers.formatEther(totalCost),
    };
  } catch (error) {
    console.error("[GAS ESTIMATE] Error estimating gas:", error);
    return null;
  }
}

export interface ApproveNFTParams {
  contractAddress: string;
  operatorAddress: string; // Marketplace contract address
  tokenId?: string; // Optional - for single token approval
  approveAll?: boolean; // If true, uses setApprovalForAll
}

export interface ApproveNFTResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Approve NFT for marketplace operations
 * Can approve a single token or all tokens for an operator
 */
export async function approveNFTForMarketplace(
  params: ApproveNFTParams
): Promise<ApproveNFTResult> {
  try {
    const { contractAddress, operatorAddress, tokenId, approveAll = false } = params;

    console.log("[NFT APPROVE] Starting approval process...");
    console.log("[NFT APPROVE] Contract:", contractAddress);
    console.log("[NFT APPROVE] Operator:", operatorAddress);
    console.log("[NFT APPROVE] Token ID:", tokenId);
    console.log("[NFT APPROVE] Approve All:", approveAll);

    // Get provider from Wagmi config
    const { config } = await import("@/config/wallet");
    const { getConnectorClient } = await import("wagmi/actions");
    const { BrowserProvider } = await import("ethers");

    // Get the connected wallet client
    const connectorClient = await getConnectorClient(config);

    if (!connectorClient || !connectorClient.account) {
      throw new Error("No wallet provider found. Please connect your wallet.");
    }

    const userAddress = connectorClient.account.address;
    console.log("[NFT APPROVE] User address:", userAddress);

    // Create ethers provider and signer from Wagmi client
    const provider = new BrowserProvider(connectorClient);
    const signer = await provider.getSigner();

    // Create contract instance
    const nftContract = new ethers.Contract(
      contractAddress,
      ERC721_NFT_ABI,
      signer
    );

    let tx;

    if (approveAll) {
      // Approve all tokens for the operator
      console.log("[NFT APPROVE] Calling setApprovalForAll...");
      tx = await nftContract.setApprovalForAll(operatorAddress, true);
    } else {
      // Approve single token
      if (!tokenId) {
        throw new Error("Token ID is required for single token approval");
      }
      console.log("[NFT APPROVE] Calling approve for token", tokenId, "...");
      tx = await nftContract.approve(operatorAddress, tokenId);
    }

    console.log("[NFT APPROVE] Transaction sent:", tx.hash);

    // Wait for confirmation
    console.log("[NFT APPROVE] Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("[NFT APPROVE] Transaction confirmed:", receipt);

    if (receipt.status === 0) {
      throw new Error("Approval transaction failed");
    }

    return {
      success: true,
      transactionHash: tx.hash,
    };
  } catch (error: any) {
    console.error("[NFT APPROVE] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to approve NFT",
    };
  }
}

export interface CheckApprovalParams {
  contractAddress: string;
  tokenId: string;
  operatorAddress: string; // Marketplace contract address
}

/**
 * Check if an NFT is approved for marketplace operations
 * Returns true if approved, false if not
 */
export async function checkNFTApproval(
  params: CheckApprovalParams
): Promise<boolean> {
  try {
    const { contractAddress, tokenId, operatorAddress } = params;

    console.log("[NFT APPROVAL CHECK] Checking approval status...");
    console.log("[NFT APPROVAL CHECK] Contract:", contractAddress);
    console.log("[NFT APPROVAL CHECK] Token ID:", tokenId);
    console.log("[NFT APPROVAL CHECK] Operator:", operatorAddress);

    // Get provider from Wagmi config
    const { config } = await import("@/config/wallet");
    const { getConnectorClient } = await import("wagmi/actions");
    const { BrowserProvider } = await import("ethers");

    // Get the connected wallet client
    const connectorClient = await getConnectorClient(config);

    if (!connectorClient || !connectorClient.account) {
      throw new Error("No wallet provider found. Please connect your wallet.");
    }

    const userAddress = connectorClient.account.address;

    // Create ethers provider from Wagmi client
    const provider = new BrowserProvider(connectorClient);

    // Create contract instance (read-only, no signer needed)
    const nftContract = new ethers.Contract(
      contractAddress,
      ERC721_NFT_ABI,
      provider
    );

    // Check if the specific token is approved for the operator
    const approvedAddress = await nftContract.getApproved(tokenId);
    console.log("[NFT APPROVAL CHECK] Approved address for token:", approvedAddress);

    if (approvedAddress.toLowerCase() === operatorAddress.toLowerCase()) {
      console.log("[NFT APPROVAL CHECK] Token is approved ✓");
      return true;
    }

    // Also check if operator has approval for all tokens from the owner
    const isApprovedForAll = await nftContract.isApprovedForAll(userAddress, operatorAddress);
    console.log("[NFT APPROVAL CHECK] Is approved for all:", isApprovedForAll);

    if (isApprovedForAll) {
      console.log("[NFT APPROVAL CHECK] Operator is approved for all tokens ✓");
      return true;
    }

    console.log("[NFT APPROVAL CHECK] Token is NOT approved ✗");
    return false;
  } catch (error: any) {
    console.error("[NFT APPROVAL CHECK] Error:", error);
    // Return false on error - assume not approved
    return false;
  }
}
