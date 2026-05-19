import { ethers } from "ethers";
import { ERC721_NFT_ABI } from "./nft-abis";

/**
 * Enable public minting on an NFT collection contract
 * Must be called by the contract owner
 */
export async function enablePublicMint(contractAddress: string): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    const { config } = await import("@/config/wallet");
    const { getConnectorClient } = await import("wagmi/actions");
    const { BrowserProvider } = await import("ethers");

    // Get the connected wallet
    const connectorClient = await getConnectorClient(config);

    if (!connectorClient || !connectorClient.account) {
      throw new Error("Please connect your wallet first");
    }

    // Create ethers provider
    const provider = new BrowserProvider(connectorClient.transport);
    const signer = await provider.getSigner();

    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      ERC721_NFT_ABI,
      signer
    );

    console.log("[ENABLE PUBLIC MINT] Checking current status...");

    // Check if public minting is already enabled
    try {
      const isEnabled = await contract.isPublicMintEnabled();
      if (isEnabled) {
        return {
          success: true,
          error: "Public minting is already enabled for this collection",
        };
      }
    } catch (error) {
      console.warn("[ENABLE PUBLIC MINT] Could not check current status:", error);
    }

    console.log("[ENABLE PUBLIC MINT] Enabling public minting...");

    // Call togglePublicMint(true)
    const tx = await contract.togglePublicMint(true);

    console.log("[ENABLE PUBLIC MINT] Transaction sent:", tx.hash);
    console.log("[ENABLE PUBLIC MINT] Waiting for confirmation...");

    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    console.log("[ENABLE PUBLIC MINT] Public minting enabled successfully!");

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error: any) {
    console.error("[ENABLE PUBLIC MINT] Error:", error);

    let errorMessage = "Failed to enable public minting";

    if (error.message?.includes("Ownable: caller is not the owner")) {
      errorMessage = "Only the contract owner can enable public minting";
    } else if (error.code === 4001 || error.code === "ACTION_REJECTED") {
      errorMessage = "Transaction was rejected by user";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
