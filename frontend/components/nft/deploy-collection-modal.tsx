"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Info,
  Rocket,
} from "lucide-react";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useDisconnect } from "wagmi";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";

interface DeployCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: any;
  onSuccess: () => void;
}

export function DeployCollectionModal({
  isOpen,
  onClose,
  collection,
  onSuccess,
}: DeployCollectionModalProps) {
  const t = useTranslations("nft");
  const { isConnected, address } = useAppKitAccount();
  const { open: openAppKit } = useAppKit();
  const { disconnect } = useDisconnect();

  const [step, setStep] = useState<"connect" | "confirm" | "deploying" | "success">("connect");
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [estimatedGas, setEstimatedGas] = useState<string>("~");
  const [loading, setLoading] = useState(false);

  // Guard against undefined collection
  if (!collection) {
    return null;
  }

  // Update step when wallet connects or disconnects
  useEffect(() => {
    if (isConnected && step === "connect") {
      setStep("confirm");
    } else if (!isConnected && (step === "confirm" || step === "deploying")) {
      // Go back to connect step if wallet disconnects while on confirm or deploying step
      setStep("connect");
    }
  }, [isConnected, step]);

  // Reset state when modal opens (only when isOpen changes, not when wallet connects)
  useEffect(() => {
    if (isOpen) {
      if (isConnected) {
        setStep("confirm");
      } else {
        setStep("connect");
      }
      setDeploymentResult(null);
      // Estimate gas (rough estimate for contract deployment)
      setEstimatedGas("0.005 - 0.01");
    }
  }, [isOpen]); // Only run when modal opens, not when isConnected changes

  const handleConnectWallet = () => {
    console.log("[Deploy Modal] Opening wallet connection");
    openAppKit({ view: "Connect" });
  };

  // Prevent modal from closing when wallet connects
  useEffect(() => {
    console.log("[Deploy Modal] State:", { isOpen, isConnected, step });
  }, [isOpen, isConnected, step]);

  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
      setStep("connect");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setStep("deploying");

    try {
      // Deploy contract via Web3
      const { deployNFTContract } = await import("@/utils/nft-deploy");

      const result = await deployNFTContract({
        name: collection.name,
        symbol: collection.symbol,
        baseTokenURI: collection.baseURI || "",
        maxSupply: collection.maxSupply || 10000,
        royaltyPercentage: Math.floor((collection.royaltyPercentage || 0) * 100),
        mintPrice: (collection.mintPrice || 0).toString(),
        isPublicMint: collection.isPublicMint || true,
        standard: collection.standard || "ERC721",
        chain: collection.chain || "BSC",
      });

      // Save deployment information to backend
      const { data, error } = await $fetch({
        url: `/api/nft/contract/deployed`,
        method: "POST",
        body: {
          collectionId: collection.id,
          contractAddress: result.contractAddress,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          deploymentCost: result.deploymentCost,
          chain: collection.chain || "BSC",
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to save deployment information");
      }

      setDeploymentResult(result);
      setStep("success");
      toast.success("Contract deployed successfully!");

      // Call onSuccess after a short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (error: any) {
      console.error("Error deploying contract:", error);
      toast.error(error.message || "Failed to deploy contract");
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const getBlockExplorerUrl = () => {
    const chain = collection.chain?.toLowerCase() || "bsc";
    const baseUrls: Record<string, string> = {
      bsc: "https://bscscan.com",
      eth: "https://etherscan.io",
      polygon: "https://polygonscan.com",
      arbitrum: "https://arbiscan.io",
      optimism: "https://optimistic.etherscan.io",
      base: "https://basescan.org",
    };

    const baseUrl = baseUrls[chain] || baseUrls.bsc;
    return deploymentResult
      ? `${baseUrl}/tx/${deploymentResult.transactionHash}`
      : baseUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing when explicitly clicking close button or ESC
      // Don't close when wallet modal opens
      if (!open && step !== "deploying") {
        onClose();
      }
    }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" onInteractOutside={(e) => {
        // Prevent closing when clicking outside while wallet modal is open
        e.preventDefault();
      }}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deploy NFT Collection
          </DialogTitle>
          <DialogDescription>
            Deploy your collection smart contract to the blockchain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Collection Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">{collection.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{collection.standard || "ERC721"}</Badge>
              <Badge variant="outline">{collection.chain || "BSC"}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <p>Symbol: <span className="font-medium">{collection.symbol}</span></p>
              <p>Max Supply: <span className="font-medium">{collection.maxSupply || "Unlimited"}</span></p>
              <p>Royalty: <span className="font-medium">{collection.royaltyPercentage || 0}%</span></p>
            </div>
          </div>

          <Separator />

          {/* Step: Connect Wallet */}
          {step === "connect" && (
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-500 mb-1">Connect Your Wallet</p>
                <p className="text-muted-foreground">
                  You need to connect your wallet to deploy the smart contract. Your wallet will be the owner of the contract.
                </p>
              </div>
            </div>
          )}

          {/* Step: Confirm Deployment */}
          {step === "confirm" && (
            <div className="space-y-4">
              {/* Wallet Connected */}
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Wallet Connected</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectWallet}
                >
                  Disconnect
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-1">
                  <span className="font-medium">Connected Wallet:</span>{" "}
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>

              {/* Deployment Details */}
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Deployment Details</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="font-medium text-foreground">
                      {collection.chain || "BSC"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Gas:</span>
                    <span className="font-medium text-foreground">
                      {estimatedGas} {collection.chain === "ETH" ? "ETH" : "BNB"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contract Owner:</span>
                    <span className="font-medium text-foreground">You</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Royalty Recipient:</span>
                    <span className="font-medium text-foreground">You</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-yellow-500 mb-1">Important</p>
                  <p className="text-muted-foreground">
                    You will need to confirm the transaction in your wallet and pay the gas fees.
                    Make sure you have enough {collection.chain === "ETH" ? "ETH" : "BNB"} in your wallet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step: Deploying */}
          {step === "deploying" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Deploying Contract...</h3>
                <p className="text-sm text-muted-foreground">
                  Please confirm the transaction in your wallet
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && deploymentResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Contract Deployed Successfully!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your NFT collection is now live on the blockchain
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Address:</span>
                  <span className="font-mono font-medium">
                    {deploymentResult.contractAddress.slice(0, 6)}...
                    {deploymentResult.contractAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas Used:</span>
                  <span className="font-medium">{deploymentResult.gasUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deployment Cost:</span>
                  <span className="font-medium">
                    {deploymentResult.deploymentCost} {collection.chain === "ETH" ? "ETH" : "BNB"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer with Action Buttons */}
        <div className="flex-shrink-0 border-t pt-4 mt-4">
          {step === "connect" && (
            <Button
              onClick={handleConnectWallet}
              className="w-full"
              size="lg"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}

          {step === "confirm" && (
            <Button
              onClick={handleDeploy}
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Deploy Contract
                </>
              )}
            </Button>
          )}

          {step === "success" && deploymentResult && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(getBlockExplorerUrl(), "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Block Explorer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
