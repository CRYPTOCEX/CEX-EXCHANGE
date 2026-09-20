"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import {
  Wallet,
  ArrowRight,
  AlertTriangle,
  Shield,
  Globe,
  Zap,
  Info,
} from "lucide-react";
import { SiweMessage } from "siwe";
import { Badge } from "@/components/ui/badge";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";
import { useTranslations } from "next-intl";

interface WalletLoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

function WalletLoginButton({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations("components_auth");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useUserStore((state) => state.setUser);

  // AppKit hooks
  const { open: openAppKit } = useAppKit();
  const account = useAppKitAccount();
  const network = useAppKitNetwork();
  // Signs through whichever connector wagmi is holding — injected, or a
  // WalletConnect session living on the user's phone. `window.ethereum` only
  // exists for injected wallets, so signing through it is what let mobile
  // MetaMask / Rainbow / Trust pair and then fail at the login signature.
  const { signMessageAsync } = useSignMessage();

  // Fetch a single-use nonce issued (and bound in Redis) by the server. The nonce
  // is consumed exactly once on /api/auth/login/wallet, so a captured
  // (message, signature) pair cannot be replayed. Generating the nonce
  // client-side (as before) provided no replay protection.
  async function fetchServerNonce(): Promise<string> {
    const res = await fetch("/api/auth/login/nonce", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error("Failed to obtain a login nonce. Please try again.");
    }
    let nonce = (await res.text()).trim();
    // The endpoint may return the nonce as a raw string, a JSON-quoted string,
    // or a { nonce } object — normalize all shapes.
    try {
      const parsed = JSON.parse(nonce);
      if (typeof parsed === "string") nonce = parsed;
      else if (parsed && typeof parsed === "object" && typeof parsed.nonce === "string")
        nonce = parsed.nonce;
    } catch {
      /* already a raw string */
    }
    if (!nonce || nonce.length < 8) {
      throw new Error("Received an invalid login nonce. Please try again.");
    }
    return nonce;
  }

  const handleWalletLogin = async () => {
    if (!account.isConnected) {
      try {
        // Connect wallet
        setIsLoading(true);
        setError(null);

        // Define the expected result type for openAppKit
        type OpenAppKitResult = {
          success?: boolean;
          userRejected?: boolean;
          noWallet?: boolean;
          error?: string;
        };

        const result = (await openAppKit({
          view: "Connect",
        })) as OpenAppKitResult | void;

        // If openAppKit returns void, just return early (no error)
        if (typeof result === "undefined") {
          // Assume user closed the modal or cancelled
          setIsLoading(false);
          return;
        }

        // If result has a 'success' property, handle as before
        if ("success" in result && !result.success) {
          // Handle different error cases
          if (result.userRejected) {
            // User rejected the connection - this is a normal flow, not an error
            console.log("User rejected wallet connection");
            // Don't show an error toast for user rejections
          } else if (result.noWallet) {
            // No wallet detected
            toast({
              title: tCommon("wallet_not_found"),
              description:
                t("please_install_metamask_or_another_ethereum"),
              variant: "destructive",
            });
            setError(
              t("no_wallet_detected_please_install_metamask")
            );
          } else {
            // Other connection error
            toast({
              title: tCommon("connection_error"),
              description:
                result.error || tCommon("failed_to_connect_wallet_please_try_again"),
              variant: "destructive",
            });
            setError(result.error || t("failed_to_connect_wallet"));
          }
        }
      } catch (error: any) {
        console.error("Unexpected error during wallet connection:", error);
        // Only show toast for unexpected errors
        toast({
          title: tCommon("connection_error"),
          description: tCommon("an_unexpected_error_occurred_please_try_again"),
          variant: "destructive",
        });
        setError(tCommon("unexpected_error"));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!account.address) {
      toast({
        title: t("wallet_error"),
        description: t("no_wallet_address_found_please_reconnect"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // The address is `account.address` from useAppKitAccount rather than a
      // signer's getAddress(): it is already EIP-55 checksummed, which is what
      // SiweMessage validates on. The nonce is server-issued and single-use
      // (replay-safe) instead of client-generated.
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address: account.address,
        statement: "Sign in with Ethereum to P2P Platform",
        uri: window.location.origin,
        version: "1",
        chainId: Number.parseInt(String(network.chainId || "1")),
        nonce: await fetchServerNonce(),
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60_000).toISOString(),
      });

      const message = siweMessage.prepareMessage();

      // Sign the message
      const signature = await signMessageAsync({ message });

      // Send to our API for verification
      const response = await fetch("/api/auth/login/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          signature,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login was successful - now fetch the user profile
        // The backend returns { message, cookies } not { user }
        try {
          const profileResponse = await fetch("/api/user/profile", {
            method: "GET",
            credentials: "include",
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setUser(profileData);
          }

          toast({
            title: t("login_successful"),
            description:
              t("you_have_been_successfully_logged_in"),
          });

          if (onSuccess) {
            onSuccess();
          }
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
          // Still call onSuccess since login worked, the user state will update on next page load
          toast({
            title: t("login_successful"),
            description:
              t("you_have_been_successfully_logged_in"),
          });
          if (onSuccess) {
            onSuccess();
          }
        }
      } else {
        setError(data.error || t("authentication_failed"));
        toast({
          title: t("authentication_failed"),
          description: data.error || t("failed_to_authenticate_with_wallet"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Wallet login error:", error);

      // Check if this is a nonce format error
      if (
        error.type ===
          "Nonce size smaller then 8 characters or is not alphanumeric." ||
        (error.message && error.message.includes("Nonce"))
      ) {
        setError(t("authentication_error_please_try_again"));
        toast({
          title: t("authentication_error"),
          description:
            t("there_was_an_issue_with_the"),
          variant: "destructive",
        });
      }
      // Check if this is a case sensitivity error with the address
      else if (
        error.type === "Invalid address." ||
        (error.message && error.message.includes("Invalid address")) ||
        (error.expected && error.received)
      ) {
        setError(t("address_format_error_please_try_again"));
        toast({
          title: t("address_format_error"),
          description:
            t("there_was_an_issue_with_your"),
          variant: "destructive",
        });
      }
      // Check if this is a user rejection of the signature
      else if (
        error.code === 4001 ||
        error.message?.includes("user rejected") ||
        error.message?.includes("user denied")
      ) {
        // User rejected the signature request - this is a normal flow
        setError(t("you_declined_to_sign_the_authentication_message"));
        // Use a neutral toast for user rejections
        toast({
          title: t("authentication_cancelled"),
          description: t("you_declined_to_sign_the_authentication_message"),
        });
      } else {
        // Other errors
        setError(error.message || tCommon("unexpected_error"));
        toast({
          title: t("login_error"),
          description: error.message || tCommon("unexpected_error"),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /*
      `<Button loading>`, not a hand-rolled two-branch swap.

      This was a 20-line inline `<svg>` spinner in one
      `<span className="flex items-center justify-center">` traded for a second
      span holding a wallet icon, a label and an arrow — a whole subtree
      replaced for a control that only changes its word and gains a spinner.
      `Button` draws a `size-4` spinner into its leading slot when `loading`,
      sets `aria-busy` so the wait is announced rather than merely animated,
      folds `loading` into its own `disabled` (hence `disabled={isLoading}`
      coming out), and is already `inline-flex items-center justify-center
      gap-2`, which is all the wrapper spans were contributing.

      This button holds its size through the whole flow, which matters more here
      than on a form submit: connecting a wallet is not a 200ms request, it is a
      round trip through an extension the user has to click in, so this control
      sits in its pending state for seconds while they look at something else.
      `w-full` fixes the width and `py-6 text-base` the height, so the four
      possible labels — connect / connecting / sign in / signing in — all
      re-centre inside one unchanging box.

      No auth logic is touched: same handler, same `account.isConnected` reads,
      same `isLoading`.
    */
    <Button
      onClick={handleWalletLogin}
      /* Load-bearing beyond debugging: e2e/ui/dex/wallet-regressions.pw.ts
         asserts that NO personal_sign is requested until this exact control is
         clicked. wagmi now restores connections across reloads, so "the form
         only signs on submit" stopped being self-evident and became something
         a test has to hold. */
      data-testid="wallet-login-submit"
      className="w-full py-6 text-base bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
      loading={isLoading}
    >
      {/*
        INTENTIONAL — the same exemption `trading-bot/bot/client.tsx`,
        `connectivity-tester.tsx` and `staking/position/components/details.tsx`
        carry, and the debt scanner's `hidden-while-loading` rule cannot tell it
        from a withheld row.

        `Button` puts its own spinner in the LEADING slot, which is where this
        `h-5 w-5` wallet sits. Rendering both gives the button two leading
        glyphs — 20px + 8px + 16px of icon ahead of the label instead of 20px —
        and reads as a bug. Stepping the wallet aside is what keeps exactly one
        spinning 16px glyph there. The trailing arrow is unaffected and stays,
        because nothing else wants that slot.
      */}
      {!isLoading && <Wallet className="h-5 w-5" />}
      {isLoading
        ? account.isConnected
          ? `${t("signing_in")}…`
          : `${t("connecting_wallet")}…`
        : account.isConnected
          ? t("sign_in_with_wallet")
          : tCommon("connect_wallet")}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

export default function WalletLoginForm({
  onSuccess,
  onCancel,
}: WalletLoginFormProps) {
  const t = useTranslations("components_auth");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const account = useAppKitAccount();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Update wallet address when account changes
  useEffect(() => {
    if (account.address) {
      setWalletAddress(account.address);
    } else {
      setWalletAddress(null);
    }
  }, [account.address]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary-ink to-primary-ink/70">
          {t("wallet_login")}
        </h2>
        <p className="text-muted-foreground">
          {t("connect_your_wallet_to_sign_in_securely")}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive-ink flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {account.isConnected && walletAddress ? (
        <div className="bg-success/30 rounded-xl p-6 border border-success">
          <div className="flex items-start gap-4">
            <div className="bg-success/50 p-3 rounded-full">
              <Wallet className="h-6 w-6 text-success" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-success">
                {tCommon("wallet_connected")}
              </h3>
              <p className="text-success">
                {t("your_wallet_is_connected")}. {tCommon("address")}
                {walletAddress.slice(0, 6)}
                {walletAddress.slice(-4)}
              </p>
              <p className="text-success">
                {t("click_the_button_below_to_sign_in_with_your_wallet")}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-primary/30 rounded-xl p-6 border border-primary">
          <div className="flex items-start gap-4">
            <div className="bg-primary/15 dark:bg-primary/50 p-3 rounded-full">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-primary">
                {tCommon("connect_your_crypto_wallet")}
              </h3>
              <p className="text-primary">
                {tCommon("link_your_wallet_secure_transactions")}.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary-ink border-primary/30 dark:bg-primary/50"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {tCommon("secure")}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary-ink border-primary/30 dark:bg-primary/50"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {tCommon("fast")}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary-ink border-primary/30 dark:bg-primary/50"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  {tCommon("multi_chain")}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <WalletLoginButton onSuccess={onSuccess} />

        <Button variant="ghost" onClick={onCancel} className="w-full">
          {tCommon("cancel")}
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p>{t("by_connecting_your_privacy_policy")}.</p>
      </div>

      <div className="p-3 bg-primary/10 border border-primary rounded-lg text-sm text-primary-ink flex items-start">
        <Info className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-primary" />
        <span>
          {t("youll_need_to_approve_two_requests_in_your_wallet")}
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            <li>{t("first_to_connect_your_wallet")}</li>
            <li>{t("then_to_sign_a_message_proving_you_own_the_wallet")}</li>
          </ol>
        </span>
      </div>
    </div>
  );
}
