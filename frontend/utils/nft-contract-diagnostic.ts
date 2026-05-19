import { ethers } from "ethers";
import { ERC721_NFT_ABI } from "./nft-abis";

/**
 * Diagnostic tool to check NFT contract state and find issues
 */
export async function diagnoseNFTContract(
  contractAddress: string,
  provider: ethers.BrowserProvider
): Promise<{
  totalSupply: number;
  maxSupply: number;
  isPublicMint: boolean;
  tokenURIs: Record<number, string>;
  issues: string[];
}> {
  const issues: string[] = [];
  const tokenURIs: Record<number, string> = {};

  try {
    // Check network first
    const network = await provider.getNetwork();
    console.log("[DIAGNOSTIC] Connected to network:", {
      chainId: network.chainId.toString(),
      name: network.name
    });

    // Verify contract exists
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address ${contractAddress}. The contract may not be deployed on this network.`);
    }

    console.log("[DIAGNOSTIC] Contract exists at:", contractAddress);

    const contract = new ethers.Contract(contractAddress, ERC721_NFT_ABI, provider);

    // Get contract state with individual try-catch for each call
    let totalSupply = 0;
    let maxSupply = 0;
    let isPublicMint = false;

    try {
      totalSupply = Number((await contract.totalSupply()).toString());
      console.log("[DIAGNOSTIC] totalSupply:", totalSupply);
    } catch (error: any) {
      issues.push(`Failed to read totalSupply: ${error.message}`);
    }

    try {
      maxSupply = Number((await contract.maxSupply()).toString());
      console.log("[DIAGNOSTIC] maxSupply:", maxSupply);
    } catch (error: any) {
      issues.push(`Failed to read maxSupply: ${error.message}`);
    }

    try {
      isPublicMint = await contract.isPublicMint();
      console.log("[DIAGNOSTIC] isPublicMint:", isPublicMint);
    } catch (error: any) {
      issues.push(`Failed to read isPublicMint: ${error.message}`);
    }

    console.log("[DIAGNOSTIC] Contract State Summary:", {
      totalSupply,
      maxSupply,
      isPublicMint
    });

    // Check if max supply reached
    if (maxSupply > 0 && totalSupply >= maxSupply) {
      issues.push(`Max supply reached: ${totalSupply}/${maxSupply}`);
    }

    // Check if public minting is disabled
    if (!isPublicMint) {
      issues.push("Public minting is disabled");
    }

    // Try to get tokenURIs for existing tokens
    console.log(`[DIAGNOSTIC] Checking ${totalSupply} minted tokens...`);
    for (let i = 1; i <= totalSupply; i++) {
      try {
        const uri = await contract.tokenURI(i);
        tokenURIs[i] = uri;
        console.log(`[DIAGNOSTIC] Token ${i}: ${uri.substring(0, 60)}...`);
      } catch (error) {
        issues.push(`Token ${i} exists but tokenURI() failed - contract may be corrupted`);
        console.error(`[DIAGNOSTIC] Failed to get tokenURI for token ${i}:`, error);
      }
    }

    // Check for duplicate tokenURIs
    const uriMap = new Map<string, number[]>();
    Object.entries(tokenURIs).forEach(([tokenId, uri]) => {
      const existing = uriMap.get(uri) || [];
      existing.push(Number(tokenId));
      uriMap.set(uri, existing);
    });

    // Report duplicates
    uriMap.forEach((tokenIds, uri) => {
      if (tokenIds.length > 1) {
        issues.push(
          `Duplicate tokenURI found: "${uri.substring(0, 40)}..." ` +
          `is used by tokens: ${tokenIds.join(", ")}`
        );
      }
    });

    return {
      totalSupply,
      maxSupply,
      isPublicMint,
      tokenURIs,
      issues
    };
  } catch (error: any) {
    console.error("[DIAGNOSTIC] Failed to diagnose contract:", error);
    issues.push(`Diagnostic failed: ${error.message}`);
    return {
      totalSupply: 0,
      maxSupply: 0,
      isPublicMint: false,
      tokenURIs: {},
      issues
    };
  }
}
