"use client";

import { useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Shield,
  Globe,
  Zap,
  CheckCircle2,
  Link as LinkIcon,
  ExternalLink,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/store/user";
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
  useAppKitNetwork,
} from "@reown/appkit/react";
import { LazyWalletProvider } from "@/context/wallet-lazy";
import { useTranslations } from "next-intl";

const WalletTabContent = memo(function WalletTabContent() {
  const t = useTranslations("common");
  const tDashboardUser = useTranslations("dashboard_user");
  const { user, connectWallet, disconnectWallet } = useUserStore();
  const { toast } = useToast();

  const account = useAppKitAccount() || { isConnected: false, address: null };
  const appKit = useAppKit() || { open: () => {} };
  const { open: openAppKit } = appKit;
  const disconnectHook = useDisconnect() || { disconnect: async () => {} };
  const { disconnect } = disconnectHook;
  const network = useAppKitNetwork() || { chainId: null, caipNetwork: null };
  const connectWalletRef = useRef(false);

  const handleConnect = () => {
    openAppKit({ view: "Connect" });
  };

  const handleDisconnect = async () => {
    if (!account?.address) return;

    try {
      await disconnect();
      await disconnectWallet(account.address);
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected successfully.",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast({
        title: "Disconnect Error",
        description: "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyAddress = async () => {
    if (!account?.address) return;
    await navigator.clipboard.writeText(account.address);
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard.",
    });
  };

  useEffect(() => {
    const connectWalletToBackend = async () => {
      if (
        account?.isConnected &&
        account?.address &&
        network?.chainId &&
        !connectWalletRef.current &&
        !user?.providers?.some(
          (p) =>
            p.provider === "WALLET" &&
            p.providerUserId.toLowerCase() === account.address?.toLowerCase()
        )
      ) {
        connectWalletRef.current = true;
        const chainId = network.chainId;
        try {
          const success = await connectWallet(account.address, chainId);
          if (success) {
            toast({
              title: "Wallet Connected",
              description: "Your wallet has been connected successfully.",
            });
          } else {
            toast({
              title: "Connection Failed",
              description: "Failed to connect wallet. Please try again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error connecting wallet to backend:", error);
          toast({
            title: "Connection Error",
            description: "Failed to connect wallet. Please try again.",
            variant: "destructive",
          });
        }
      }
    };
    connectWalletToBackend();
  }, [account?.isConnected, account?.address, network?.caipNetwork?.id]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          {tDashboardUser("external_wallet_connection")}
        </h1>
        <p className="text-zinc-500 mt-1">
          {tDashboardUser("connect_your_web3_wallet_for_blockchain")}
        </p>
      </motion.div>

      {/* Main Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <Wallet className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {t("connect_wallet")}
              </h3>
              <p className="text-sm text-zinc-500">
                {t("link_your_wallet_secure_transactions")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!account?.isConnected ? (
            <div className="space-y-6">
              {/* Not Connected State */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700/50 p-6">
                {/* Subtle glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />

                <div className="relative flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex-shrink-0">
                    <Globe className="h-8 w-8 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-white mb-2">
                      {t("connect_your_crypto_wallet")}
                    </h4>
                    <p className="text-zinc-400 mb-4">
                      {t("link_your_wallet_secure_transactions")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700 text-zinc-300"
                      >
                        <Shield className="h-3 w-3 mr-1.5" />
                        {t("secure")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700 text-zinc-300"
                      >
                        <Zap className="h-3 w-3 mr-1.5" />
                        {t("fast")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700 text-zinc-300"
                      >
                        <Globe className="h-3 w-3 mr-1.5" />
                        {t("multi_chain")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold shadow-lg shadow-amber-500/20"
              >
                <Wallet className="h-5 w-5 mr-2" />
                {t("connect_wallet")}
              </Button>

              {/* Supported Wallets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["MetaMask", "WalletConnect", "Coinbase", "Trust Wallet"].map(
                  (wallet) => (
                    <div
                      key={wallet}
                      className="flex items-center justify-center p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-sm"
                    >
                      {wallet}
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected State */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />

                <div className="relative flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex-shrink-0">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xl font-semibold text-white">
                        {t("wallet_connected")}
                      </h4>
                      <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                        Active
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-zinc-500 mb-1">{t("address")}</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-white font-mono bg-zinc-800/50 px-3 py-1.5 rounded-lg truncate max-w-[300px]">
                            {account?.address || "N/A"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyAddress}
                            className="h-8 w-8 text-zinc-400 hover:text-white"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {network?.chainId && (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-zinc-500">{t("network")}:</span>
                          <Badge
                            variant="outline"
                            className="bg-zinc-800 border-zinc-700 text-zinc-300"
                          >
                            <LinkIcon className="h-3 w-3 mr-1.5" />
                            {tDashboardUser("chain_id")} {network.chainId}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `https://etherscan.io/address/${account?.address}`,
                      "_blank"
                    )
                  }
                  className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  className="flex-1"
                >
                  {tDashboardUser("disconnect_wallet")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
            <Shield className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">
              Wallet Security
            </h4>
            <p className="text-sm text-zinc-500">
              Your wallet connection is secure and encrypted. We never store
              your private keys. Only sign transactions that you initiate and
              trust.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export function WalletTab() {
  return (
    <LazyWalletProvider cookies="">
      <WalletTabContent />
    </LazyWalletProvider>
  );
}

export default WalletTab;
