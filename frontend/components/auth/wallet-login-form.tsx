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
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@/config/wallet";
import { useTranslations } from "next-intl";

interface WalletLoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

function WalletLoginButton({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useUserStore((state) => state.setUser);

  // AppKit hooks
  const { open: openAppKit } = useAppKit();
  const account = useAppKitAccount();
  const network = useAppKitNetwork();

  // Helper function to generate alphanumeric nonce (no hyphens)
  function generateNonce(length = 32) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = chars.length;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
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
              title: "Wallet not found",
              description:
                "Please install MetaMask or another Ethereum wallet to continue.",
              variant: "destructive",
            });
            setError(
              "No wallet detected. Please install MetaMask or another Ethereum wallet."
            );
          } else {
            // Other connection error
            toast({
              title: "Connection error",
              description:
                result.error || "Failed to connect wallet. Please try again.",
              variant: "destructive",
            });
            setError(result.error || "Failed to connect wallet");
          }
        }
      } catch (error: any) {
        console.error("Unexpected error during wallet connection:", error);
        // Only show toast for unexpected errors
        toast({
          title: "Connection error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!account.address) {
      toast({
        title: "Wallet error",
        description: "No wallet address found. Please reconnect your wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if we're in a browser environment and have ethereum
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error(
          "Ethereum provider not found. Please install MetaMask."
        );
      }

      // Create a provider and signer
      let provider, signer, checksumAddress;

      // Import ethers dynamically to avoid SSR issues
      const ethers = await import("ethers");

      // Check if we're using ethers v6 or v5
      if (typeof ethers.BrowserProvider === "function") {
        // ethers v6
        provider = new ethers.BrowserProvider(window.ethereum as any);
        signer = await provider.getSigner();

        // Get the checksum address directly from the signer
        checksumAddress = await signer.getAddress();
      } else {
        // ethers v5
        provider = new (ethers.default as any).providers.Web3Provider(
          window.ethereum
        );
        signer = provider.getSigner();

        // Get the checksum address directly from the signer
        checksumAddress = await signer.getAddress();
      }

      console.log("Using checksum address:", checksumAddress);

      // Create SIWE message with alphanumeric nonce
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = "Sign in with Ethereum to P2P Platform";
      const nonce = generateNonce(32); // Generate a 32-character alphanumeric nonce
      const chainId = Number.parseInt(String(network.chainId || "1"));

      console.log("Using nonce:", nonce);

      const siweMessage = new SiweMessage({
        domain,
        address: checksumAddress, // Use the checksum address from the signer
        statement,
        uri: origin,
        version: "1",
        chainId,
        nonce,
      });

      const message = siweMessage.prepareMessage();

      // Sign the message
      const signature = await signer.signMessage(message);

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
        // Update user state
        if (data.user) {
          setUser(data.user);
          toast({
            title: "Login successful",
            description:
              "You have been successfully logged in with your wallet.",
          });

          if (onSuccess) {
            onSuccess();
          }
        }
      } else {
        setError(data.error || "Authentication failed");
        toast({
          title: "Authentication failed",
          description: data.error || "Failed to authenticate with wallet",
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
        setError("Authentication error. Please try again.");
        toast({
          title: "Authentication error",
          description:
            "There was an issue with the authentication process. Please try again.",
          variant: "destructive",
        });
      }
      // Check if this is a case sensitivity error with the address
      else if (
        error.type === "Invalid address." ||
        (error.message && error.message.includes("Invalid address")) ||
        (error.expected && error.received)
      ) {
        setError("Address format error. Please try again.");
        toast({
          title: "Address format error",
          description:
            "There was an issue with your wallet address format. Please try again.",
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
        setError("You declined to sign the authentication message");
        // Use a neutral toast for user rejections
        toast({
          title: "Authentication cancelled",
          description: "You declined to sign the authentication message.",
        });
      } else {
        // Other errors
        setError(error.message || "An unexpected error occurred");
        toast({
          title: "Login error",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleWalletLogin}
      className="w-full py-6 text-base relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {account.isConnected ? "Signing in..." : "Connecting wallet..."}
        </span>
      ) : (
        <span className="flex items-center justify-center">
          <Wallet className="mr-2 h-5 w-5" />
          {account.isConnected ? "Sign in with wallet" : "Connect wallet"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </span>
      )}
    </Button>
  );
}

export default function WalletLoginForm({
  onSuccess,
  onCancel,
}: WalletLoginFormProps) {
  const t = useTranslations("components/auth/wallet-login-form");
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
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          {t("wallet_login")}
        </h2>
        <p className="text-muted-foreground">
          {t("connect_your_wallet_to_sign_in_securely")}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {account.isConnected && walletAddress ? (
        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 rounded-xl p-6 border border-green-100 dark:border-green-900">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
              <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-green-900 dark:text-green-300">
                {t("wallet_connected")}
              </h3>
              <p className="text-green-700 dark:text-green-400">
                {t("your_wallet_is_connected")}. {t("address")}
                {walletAddress.slice(0, 6)}
                {walletAddress.slice(-4)}
              </p>
              <p className="text-green-700 dark:text-green-400">
                {t("click_the_button_below_to_sign_in_with_your_wallet")}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-100 dark:border-blue-900">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-300">
                {t("connect_your_crypto_wallet")}
              </h3>
              <p className="text-blue-700 dark:text-blue-400">
                {t("link_your_wallet_secure_transactions")}.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {t("Secure")}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {t("Fast")}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  {t("Multi-chain")}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <WalletLoginButton onSuccess={onSuccess} />

        <Button variant="ghost" onClick={onCancel} className="w-full">
          {t("Cancel")}
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p>{t("by_connecting_your_privacy_policy")}.</p>
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg text-sm text-blue-700 dark:text-blue-400 flex items-start">
        <Info className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-blue-500" />
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
