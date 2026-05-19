import { BrowserProvider, Contract, parseEther } from "ethers";

// Minimal marketplace ABI with only the functions we need
export const MARKETPLACE_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "nftContract",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "buyItem",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "royaltyPercentage",
        type: "uint256",
      },
    ],
    name: "calculateFees",
    outputs: [
      {
        internalType: "uint256",
        name: "marketplaceFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "royaltyFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sellerAmount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "nftContract",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "seller",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "marketplaceFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "royaltyFee",
        type: "uint256",
      },
    ],
    name: "ItemSold",
    type: "event",
  },
];

export interface PurchaseParams {
  marketplaceAddress: string;
  nftContractAddress: string;
  tokenId: string;
  price: string; // Price in native currency (e.g., "0.1" for 0.1 ETH)
  royaltyPercentage?: number;
}

export interface PurchaseResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  buyer: string;
  totalPaid: string;
}

export async function purchaseNFT(params: PurchaseParams): Promise<PurchaseResult> {
  const { marketplaceAddress, nftContractAddress, tokenId, price, royaltyPercentage = 0 } = params;

  // Import wagmi config
  const { config } = await import("@/config/wallet");
  const { getConnectorClient } = await import("wagmi/actions");

  // Get connector client
  const connectorClient = await getConnectorClient(config);
  const userAddress = connectorClient.account.address;

  // Create ethers provider and signer
  const provider = new BrowserProvider(connectorClient.transport);
  const signer = await provider.getSigner();

  // Create marketplace contract instance
  const marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, signer);

  // Calculate fees first to show user the total cost
  const priceWei = parseEther(price);
  const [marketplaceFee, royaltyFee, sellerAmount] = await marketplace.calculateFees(
    priceWei,
    royaltyPercentage
  );

  const totalCost = priceWei + marketplaceFee + royaltyFee;

  // Execute purchase
  const tx = await marketplace.buyItem(nftContractAddress, tokenId, {
    value: totalCost,
  });

  // Wait for transaction to be mined
  const receipt = await tx.wait();

  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: receipt.gasPrice?.toString() || "0",
    buyer: userAddress,
    totalPaid: totalCost.toString(),
  };
}

/**
 * Calculate purchase fees without executing the transaction
 */
export async function calculatePurchaseFees(params: {
  marketplaceAddress: string;
  price: string;
  royaltyPercentage?: number;
}): Promise<{
  marketplaceFee: string;
  royaltyFee: string;
  sellerAmount: string;
  totalCost: string;
}> {
  const { marketplaceAddress, price, royaltyPercentage = 0 } = params;

  // Import wagmi config
  const { config } = await import("@/config/wallet");
  const { getConnectorClient } = await import("wagmi/actions");

  // Get connector client
  const connectorClient = await getConnectorClient(config);

  // Create ethers provider
  const provider = new BrowserProvider(connectorClient.transport);

  // Create marketplace contract instance (read-only, no signer needed)
  const marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, provider);

  // Calculate fees
  const priceWei = parseEther(price);
  const [marketplaceFee, royaltyFee, sellerAmount] = await marketplace.calculateFees(
    priceWei,
    royaltyPercentage
  );

  const totalCost = priceWei + marketplaceFee + royaltyFee;

  return {
    marketplaceFee: marketplaceFee.toString(),
    royaltyFee: royaltyFee.toString(),
    sellerAmount: sellerAmount.toString(),
    totalCost: totalCost.toString(),
  };
}
