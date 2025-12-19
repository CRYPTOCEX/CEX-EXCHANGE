"use client";

import { useEffect, useRef } from "react";
import { Wallet, Shield, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStore } from "@/store/user";
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
  useAppKitNetwork,
} from "@reown/appkit/react";
import WalletProvider from "@/context/wallet";
import { useTranslations } from "next-intl";

export function WalletTab() {
  const t = useTranslations("common");
  const tDashboardUser = useTranslations("dashboard_user");
  const { user, connectWallet, disconnectWallet } = useUserStore();
  const { toast } = useToast();

  // Safe hook calls with error boundaries
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
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast({
        title: "Disconnect Error",
        description: "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      });
    }
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
          console.error('Error connecting wallet to backend:', error);
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
    <WalletProvider cookies="">
      <div className="space-y-6">
        {/* External Wallet Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {tDashboardUser("external_wallet_connection")}
            </CardTitle>
            <CardDescription>{tDashboardUser("connect_your_web3_wallet_for_blockchain")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!account?.isConnected ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                      <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                        {t("connect_your_crypto_wallet")}
                      </h3>
                      <p className="text-blue-700 dark:text-blue-300">
                        {t("link_your_wallet_secure_transactions")}.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {t("secure")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {t("fast")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          {t("multi_chain")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleConnect} className="w-full">
                  <Wallet className="mr-2 h-4 w-4" />
                  {t("connect_wallet")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/50 dark:to-teal-950/50 rounded-xl p-6 border border-green-100 dark:border-green-800">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                      <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                        {t("wallet_connected")}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          <span className="font-medium">{t("address")}:</span>
                        </p>
                        <p className="text-green-900 dark:text-green-100 font-mono text-xs break-all bg-green-100 dark:bg-green-900/50 p-2 rounded">
                          {account?.address || 'N/A'}
                        </p>
                        {network?.chainId && (
                          <p className="text-green-700 dark:text-green-300 text-sm mt-2">
                            <span className="font-medium">{t("network")}:</span> {tDashboardUser("chain_id")} {network.chainId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="destructive" onClick={handleDisconnect} className="w-full">
                  {tDashboardUser("disconnect_wallet")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WalletProvider>
  );
}
