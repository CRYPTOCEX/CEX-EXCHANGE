"use client";

import { useCallback, useRef, useState, memo } from "react";
import { m } from "framer-motion";
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
import { useSignMessage } from "wagmi";
import { useTranslations } from "next-intl";
/*
  THE NONCE FETCH AND THE SIWE MESSAGE USED TO BE WRITTEN OUT HERE.

  They moved to `@/lib/wallet/siwe-link` when the swap terminal grew a second
  linking path. A SIWE message is validated field by field on the server —
  domain, uri, version, nonce, expiry — so two hand-written copies are two
  chances for one of them to be refused with a 401 the user cannot act on. One
  implementation, two callers, each supplying its own signer.
*/
import { linkWalletWithSiwe } from "@/lib/wallet/siwe-link";

const WalletTabContent = memo(function WalletTabContent() {
  const t = useTranslations("common");
  const tDashboardUser = useTranslations("dashboard_user");
  const { user, refreshUser, disconnectWallet } = useUserStore();
  const { toast } = useToast();

  const account = useAppKitAccount() || { isConnected: false, address: null };
  const appKit = useAppKit() || { open: () => {} };
  const { open: openAppKit } = appKit;
  const disconnectHook = useDisconnect() || { disconnect: async () => {} };
  const { disconnect } = disconnectHook;
  const network = useAppKitNetwork() || { chainId: null, caipNetwork: null };
  // Signs through whichever connector wagmi is holding — injected, or a
  // WalletConnect session living on the user's phone. `window.ethereum` only
  // exists for injected wallets, so signing through it is what made mobile
  // MetaMask / Rainbow / Trust connect and then fail at the linking signature.
  const { signMessageAsync } = useSignMessage();
  const connectWalletRef = useRef(false);
  const [linking, setLinking] = useState(false);

  const handleConnect = () => {
    openAppKit({ view: "Connect" });
  };

  const handleDisconnect = async () => {
    if (!account?.address) return;

    try {
      await disconnect();
      await disconnectWallet(account.address);
      toast({
        title: t("wallet_disconnected"),
        description: t("your_wallet_has_been_disconnected_successfully"),
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast({
        title: t("disconnect_error"),
        description: t("failed_to_disconnect_wallet_please_try_again"),
        variant: "destructive",
      });
    }
  };

  const handleCopyAddress = async () => {
    if (!account?.address) return;
    await navigator.clipboard.writeText(account.address);
    toast({
      title: t("address_copied"),
      description: t("wallet_address_copied_to_clipboard"),
    });
  };

  /**
   * Is the CONNECTED address already linked to this account?
   *
   * `user.providers` is the truth. `user.walletAddress` is a denormalised
   * mirror of the primary link maintained by a model hook, and it cannot
   * represent a second address — reading it here would report "linked" for a
   * user who connected a different wallet than the one they registered.
   */
  const isLinked = !!user?.providers?.some(
    (p) =>
      p.provider === "WALLET" &&
      p.providerUserId.toLowerCase() === account?.address?.toLowerCase()
  );

  /**
   * THIS WAS AN EFFECT, AND MAKING IT A CLICK IS THE POINT.
   *
   * It used to run from a useEffect keyed on (isConnected, address, chainId),
   * which was survivable only because wagmi was configured never to reconnect —
   * a connection could not appear without a user gesture. config/wallet.tsx now
   * persists the connector so the Swap terminal survives a mobile deep-link
   * round-trip, which means that effect would fire on page open and ask the
   * user to sign something they never requested. Signature prompts must come
   * from a click. Do not put this back in an effect.
   *
   * connectWalletRef survives as an in-flight re-entrancy guard only (double
   * click while the wallet prompt is open), and is cleared in `finally`.
   */
  const handleLinkWallet = useCallback(async () => {
      if (
        account?.isConnected &&
        account?.address &&
        network?.chainId &&
        !connectWalletRef.current
      ) {
        connectWalletRef.current = true;
        setLinking(true);
        try {
          /*
            The address is `account.address` from useAppKitAccount rather than
            a signer's getAddress(): it is already EIP-55 checksummed, which is
            what `SiweMessage` validates on.

            The signer is wagmi's `signMessageAsync`, NOT `window.ethereum` —
            that object only exists for injected wallets, so signing through it
            is what made mobile MetaMask / Rainbow / Trust connect and then fail
            at the linking signature.
          */
          const result = await linkWalletWithSiwe({
            address: account.address,
            chainId: Number.parseInt(String(network.chainId || "1")),
            signMessage: (message) => signMessageAsync({ message }),
          });

          if (result.ok) {
            /*
              `refreshUser`, not `connectWallet`. The store action posts the
              signature — which `linkWalletWithSiwe` has now already done — and
              this only needs the second half of it: re-read the profile so
              `user.providers` carries the new row and `isLinked` above flips
              without a page reload.
            */
            await refreshUser();
            toast({
              title: t("wallet_connected"),
              description: t("your_wallet_has_been_connected_successfully"),
            });
          } else if (result.reason === "rejected") {
            // Cancelling in your own wallet is a normal thing to do, so this is
            // a neutral toast and never a destructive one.
            toast({
              title: t("signature_cancelled"),
              description: t("your_wallet_is_still_connected_nothing_was_linked"),
            });
          } else {
            /*
              THE SERVER'S OWN SENTENCE, not a generic retry message. "This
              wallet address is already linked to a different account" and
              "Wallet authentication is not enabled on this platform" are
              different problems with different remedies, and the previous
              version rendered both as "failed to connect wallet, please try
              again" — advice that is wrong for both.
            */
            console.error("Error linking wallet to account:", result.message);
            toast({
              title: t("connection_error"),
              description: result.message,
              variant: "destructive",
            });
          }
        } finally {
          // Both must reset on every exit path, or a single cancelled signature
          // leaves the button spinning forever with no way back.
          connectWalletRef.current = false;
          setLinking(false);
        }
      }
  }, [
    account?.isConnected,
    account?.address,
    network?.chainId,
    refreshUser,
    signMessageAsync,
    toast,
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          {tDashboardUser("external_wallet_connection")}
        </h1>
        <p className="text-subtle-foreground mt-1">
          {tDashboardUser("connect_your_web3_wallet_for_blockchain")}
        </p>
      </m.div>

      {/* Main Wallet Card */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-surface-2/50 border border-border/50 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <Wallet className="h-5 w-5 text-warning" />
            </div>
            <div>
              {/* `bg-surface-2/50` card header, not a `bg-warning` fill — as
                  --warning-foreground (white in light mode) this title was
                  invisible on every light theme. */}
              <h3 className="text-lg font-semibold text-foreground">
                {t("connect_wallet")}
              </h3>
              <p className="text-sm text-subtle-foreground">
                {t("link_your_wallet_secure_transactions")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!account?.isConnected ? (
            <div className="space-y-6">
              {/* Not Connected State */}
              <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-muted/50 to-surface-2/50 border border-border-strong/50 p-6">
                {/* Subtle glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-warning/10 rounded-full blur-3xl" />

                <div className="relative flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-warning/20 flex-shrink-0">
                    <Globe className="h-8 w-8 text-warning" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-foreground mb-2">
                      {t("connect_your_crypto_wallet")}
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      {t("link_your_wallet_secure_transactions")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="bg-muted border-border-strong text-muted-foreground"
                      >
                        <Shield className="h-3 w-3 mr-1.5" />
                        {t("secure")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-muted border-border-strong text-muted-foreground"
                      >
                        <Zap className="h-3 w-3 mr-1.5" />
                        {t("fast")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-muted border-border-strong text-muted-foreground"
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
                className="w-full h-12 bg-warning hover:bg-warning/90 text-warning-foreground font-semibold shadow-lg shadow-warning/20"
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
                      className="flex items-center justify-center p-3 rounded-xl bg-muted/50 border border-border-strong/50 text-muted-foreground text-sm"
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
              <div className="relative overflow-hidden rounded-xl bg-success/10 border border-success/20 p-6">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-success/10 rounded-full blur-3xl" />

                <div className="relative flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-success/20 flex-shrink-0">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* On the `success/10` TINT, so the ink is the derived on-tint token. */}
                      <h4 className="text-xl font-semibold text-success-ink">
                        {t("wallet_connected")}
                      </h4>
                      <Badge tone="success" appearance="soft">
                        Active
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-subtle-foreground mb-1">{t("address")}</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-foreground font-mono bg-muted/50 px-3 py-1.5 rounded-lg truncate max-w-[300px]">
                            {account?.address || "N/A"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyAddress}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {network?.chainId && (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-subtle-foreground">{t("network")}:</span>
                          <Badge
                            variant="outline"
                            className="bg-muted border-border-strong text-muted-foreground"
                          >
                            <LinkIcon className="h-3 w-3 mr-1.5" />
                            {t("chain_id")} {network.chainId}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* The ONLY path to a signature on this page.
                  This used to happen by itself from an effect; see
                  handleLinkWallet for why it must stay a click. */}
              {!isLinked && (
                <div className="rounded-xl bg-surface-2/50 border border-border/50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-warning/10 flex-shrink-0">
                      <LinkIcon className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        {t("this_wallet_is_not_linked_to_your_account_yet")}
                      </h4>
                      <p className="text-sm text-subtle-foreground mb-4">
                        {t("youll_be_asked_to_sign_a")}
                      </p>
                      <Button
                        onClick={handleLinkWallet}
                        disabled={linking}
                        data-testid="wallet-link-submit"
                        className="w-full sm:w-auto"
                      >
                        {linking ? `${t("check_your_wallet")}…` : t("link_this_wallet_to_my_account")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `https://etherscan.io/address/${account?.address}`,
                      "_blank"
                    )
                  }
                  className="flex-1 bg-muted border-border-strong text-muted-foreground hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("view_on_explorer")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  className="flex-1"
                >
                  {t("disconnect_wallet")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </m.div>

      {/* Info Card */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-warning/5 border border-warning/10 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10 flex-shrink-0">
            <Shield className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-warning-ink mb-1">
              {t("wallet_security")}
            </h4>
            <p className="text-sm text-subtle-foreground">
              {t("your_wallet_connection_is_secure_and")}
            </p>
          </div>
        </div>
      </m.div>
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
