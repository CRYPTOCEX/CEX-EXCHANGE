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
  const t = useTranslations("ext_nft");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
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

      // Use our metadata endpoint as the baseTokenURI
      // This allows MetaMask and other wallets to display NFT metadata correctly
      // IMPORTANT: Use NEXT_PUBLIC_SITE_URL (the actual site URL) not BACKEND_URL
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4000";
      const metadataBaseURI = `${siteUrl}/api/nft/metadata/${collection.id}/`;

      const result = await deployNFTContract({
        name: collection.name,
        symbol: collection.symbol,
        baseTokenURI: metadataBaseURI,
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
        throw new Error(typeof error === 'string' ? error : (error as any)?.message || "Failed to save deployment information");
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
            {t("deploy_nft_collection")}
          </DialogTitle>
          <DialogDescription>
            {t("deploy_your_collection_smart_contract_to")}
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
              <p>{tCommon("symbol")} <span className="font-medium">{collection.symbol}</span></p>
              <p>{tCommon("max_supply")} <span className="font-medium">{collection.maxSupply || "Unlimited"}</span></p>
              <p>{tCommon("royalty")} <span className="font-medium">{collection.royaltyPercentage || 0}%</span></p>
            </div>
          </div>

          <Separator />

          {/* Step: Connect Wallet */}
          {step === "connect" && (
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-500 mb-1">{t("connect_your_wallet")}</p>
                <p className="text-muted-foreground">
                  {t("you_need_to_connect_your_wallet")} {t("your_wallet_will_be_the_owner_of_the_contract")}
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
                  <span className="text-sm font-medium">{tCommon("wallet_connected")}</span>
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
                  <span className="font-medium">{t("connected_wallet")}</span>{" "}
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>

              {/* Deployment Details */}
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">{t("deployment_details")}</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{tCommon("network")}</span>
                    <span className="font-medium text-foreground">
                      {collection.chain || "BSC"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("estimated_gas")}</span>
                    <span className="font-medium text-foreground">
                      {estimatedGas} {collection.chain === "ETH" ? "ETH" : "BNB"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("contract_owner")}</span>
                    <span className="font-medium text-foreground">You</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("royalty_recipient")}</span>
                    <span className="font-medium text-foreground">You</span>
                  </div>
                </div>
              </div>

              {/* Network Switch Warning */}
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-500 mb-1">{t("network_switch")}</p>
                  <p className="text-muted-foreground">
                    {t("if_your_wallet_is_on_a")}{" "}
                    <strong>{collection.chain || "BSC"}</strong> {t("before_deployment")}
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-yellow-500 mb-1">Important</p>
                  <p className="text-muted-foreground">
                    {t("you_will_need_to_confirm_the")} {t("make_sure_you_have_enough")} {collection.chain === "ETH" ? "ETH" : collection.chain === "BSC" ? "BNB" : collection.chain === "POLYGON" ? "MATIC" : "native tokens"} {t("in_your_wallet")}
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
                <h3 className="font-semibold">{t("deploying_contract_ellipsis")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("please_confirm_the_transaction_in_your_wallet")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("this_may_take_a_few_moments")}
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
                  <h3 className="font-semibold text-lg">{t("contract_deployed_successfully")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("your_nft_collection_is_now_live_on_the_blockchain")}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tExt("contract_address")}</span>
                  <span className="font-mono font-medium">
                    {deploymentResult.contractAddress.slice(0, 6)}...
                    {deploymentResult.contractAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("gas_used")}</span>
                  <span className="font-medium">{deploymentResult.gasUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tExt("deployment_cost")}</span>
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
              {tCommon("connect_wallet")}
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
                  {t("deploying_ellipsis")}
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  {t("deploy_contract")}
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
              {t("view_on_block_explorer")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
