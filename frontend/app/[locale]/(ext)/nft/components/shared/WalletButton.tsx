"use client";

import React, { useState } from "react";
import { useWalletStore } from "@/store/nft/wallet-store";
import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, RefreshCw, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface WalletButtonProps {
  onConnect?: () => void;
  className?: string;
}

export function WalletButton({ onConnect, className = "" }: WalletButtonProps) {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { address, chainId, isConnected } = useWalletStore();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Connection state is managed by WalletProvider's WalletStateSync component

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await open({ view: "Connect" });
      onConnect?.();
    } catch (error: any) {
      toast.error(error.message || t("failed_to_open_wallet_modal"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success(tCommon("wallet_disconnected"));
    } catch (error: any) {
      toast.error(error.message || t("failed_to_disconnect_wallet"));
    }
  };

  const handleSwitch = async () => {
    try {
      await open({ view: "Connect" });
    } catch (error: any) {
      toast.error(error.message || t("failed_to_open_wallet_modal"));
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success(t("address_copied_to_clipboard"));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getChainName = (chainId: string | null) => {
    if (!chainId) return "Unknown";

    const chains: Record<string, string> = {
      "0x1": "Ethereum",
      "0x38": "BSC",
      "0x89": "Polygon",
      "0xa4b1": "Arbitrum",
      "0xa": "Optimism",
      "0xaa36a7": "Sepolia",
      "0x5": "Goerli",
    };

    return chains[chainId] || "Unknown Network";
  };

  const getExplorerUrl = (address: string, chainId: string | null) => {
    const explorers: Record<string, string> = {
      "0x1": `https://etherscan.io/address/${address}`,
      "0x38": `https://bscscan.com/address/${address}`,
      "0x89": `https://polygonscan.com/address/${address}`,
      "0xa4b1": `https://arbiscan.io/address/${address}`,
      "0xa": `https://optimistic.etherscan.io/address/${address}`,
      "0xaa36a7": `https://sepolia.etherscan.io/address/${address}`,
    };

    return chainId ? explorers[chainId] : null;
  };

  if (!isConnected || !address) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`bg-linear-to-r bg-primary hover:bg-primary text-primary-foreground ${className}`}
      >
        <Wallet className="h-4 w-4 mr-2" />
        {isConnecting ? `${tCommon("connecting")}…` : tCommon("connect_wallet")}
      </Button>
    );
  }

  const explorerUrl = getExplorerUrl(address, chainId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`flex items-center gap-2 ${className}`}>
          <Wallet className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">{getChainName(chainId)}</span>
            <span className="font-mono text-sm">{shortenAddress(address)}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{t("connected_wallet")}</span>
            <span className="text-xs bg-success/10 dark:bg-success/10 text-success-ink px-2 py-0.5 rounded-full border border-success/20 dark:border-success/20">
              Connected
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm">{shortenAddress(address)}</span>
            <button
              onClick={copyAddress}
              className="p-1 hover:bg-muted rounded transition-colors"
              title={tExt("copy_address")}
            >
              {copied ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
          <span className="text-xs text-muted-foreground">{tCommon("network")} {getChainName(chainId)}</span>
        </div>

        <DropdownMenuSeparator />

        {explorerUrl && (
          <>
            <DropdownMenuItem asChild>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>{tCommon("view_on_explorer")}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleSwitch} className="flex items-center gap-2 cursor-pointer">
          <RefreshCw className="h-4 w-4" />
          <span>{t("switch_wallet")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDisconnect} className="flex items-center gap-2 cursor-pointer text-destructive">
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
