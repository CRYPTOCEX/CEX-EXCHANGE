"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useForexStore } from "@/store/forex/user";
import { AlertCircle, ArrowLeft, Loader2, Maximize2, Minimize2, Copy, Check, Eye, EyeOff, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function TradeClient() {
  const tCommon = useTranslations("common");
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { accounts, fetchAccounts } = useForexStore();
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCredentials, setShowCredentials] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Reload iframe
  const reloadTerminal = () => {
    setIframeKey(prev => prev + 1);
  };

  // Open in new tab
  const openInNewTab = () => {
    if (account) {
      const server = encodeURIComponent(account.broker || "");
      const login = encodeURIComponent(account.accountId || "");
      const url = account.mt === 5
        ? `https://trade.mql5.com/trade?servers=${server}&login=${login}`
        : `https://metatraderweb.app/trade?servers=${server}&login=${login}`;
      window.open(url, '_blank');
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  useEffect(() => {
    if (!accounts || Object.keys(accounts).length === 0) {
      fetchAccounts();
    }
  }, [accounts, fetchAccounts]);

  useEffect(() => {
    if (accounts && Object.keys(accounts).length > 0) {
      // Find account by ID from the accounts object (DEMO/LIVE format)
      const foundAccount = Object.values(accounts).find((acc: any) => acc.id === id);
      if (foundAccount) {
        setAccount(foundAccount);
        setError(null);
      } else {
        setError("Account not found");
      }
      setIsLoading(false);
    }
  }, [accounts, id]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
          <p className="text-zinc-400">Loading trading terminal...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {error || "Account not found"}
          </h2>
          <p className="text-zinc-400 mb-6">
            Unable to load the trading terminal for this account.
          </p>
          <Button
            onClick={() => router.push("/forex/dashboard")}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("back_to_dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  if (!account.status) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Account Pending Approval
          </h2>
          <p className="text-zinc-400 mb-6">
            This account is not yet active. Please wait for admin approval.
          </p>
          <Button
            onClick={() => router.push("/forex/dashboard")}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("back_to_dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  // Build the MetaTrader Web Terminal URL
  // Using MetaQuotes web terminal widget
  const mtVersion = account.mt === 5 ? "mt5" : "mt4";
  const server = encodeURIComponent(account.broker || "");
  const login = encodeURIComponent(account.accountId || "");

  // MetaTrader Web Terminal URL (using MetaQuotes official web terminal)
  // Note: The actual URL format depends on the broker's web terminal setup
  // Common formats:
  // 1. MetaQuotes Trade: https://trade.mql5.com/trade?servers=BrokerServer&login=12345
  // 2. Broker-specific: https://broker.com/webterminal?server=Server&login=12345

  const webTerminalUrl = account.mt === 5
    ? `https://trade.mql5.com/trade?servers=${server}&login=${login}`
    : `https://metatraderweb.app/trade?servers=${server}&login=${login}`;

  return (
    <div className={`h-screen w-full flex flex-col bg-zinc-900 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/forex/dashboard")}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-zinc-700" />
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${account.status ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="text-white font-medium">
              {account.broker} - MT{account.mt}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${account.type === "LIVE" ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}>
              {account.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Account</p>
            <p className="text-sm text-white font-mono">{account.accountId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Balance</p>
            <p className="text-sm text-emerald-400 font-medium">
              ${parseFloat(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Leverage</p>
            <p className="text-sm text-white">1:{account.leverage}</p>
          </div>
          <Button
            onClick={reloadTerminal}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-700"
            title="Reload Terminal"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={openInNewTab}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-700"
            title="Open in New Tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-700"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Trading terminal iframe */}
      <div className="flex-1 relative">
        <iframe
          key={iframeKey}
          src={webTerminalUrl}
          className="w-full h-full border-0"
          allow="fullscreen; clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />

        {/* Compact credentials panel - bottom left to avoid blocking terminal UI */}
        {showCredentials && (
          <div className="absolute bottom-2 left-2 bg-zinc-800/95 backdrop-blur-sm rounded-lg p-2 border border-zinc-700 shadow-xl text-xs z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-zinc-400">Credentials:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCredentials(false)}
                className="h-4 w-4 p-0 text-zinc-500 hover:text-white ml-auto"
              >
                ×
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {/* Server */}
              <div className="flex items-center gap-1 bg-zinc-900/80 rounded px-2 py-1">
                <span className="text-zinc-500">S:</span>
                <span className="text-emerald-400 font-mono">{account.broker}</span>
                <button
                  onClick={() => copyToClipboard(account.broker || "", "Server")}
                  className="text-zinc-500 hover:text-emerald-400 ml-1"
                >
                  {copiedField === "Server" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              {/* Login */}
              <div className="flex items-center gap-1 bg-zinc-900/80 rounded px-2 py-1">
                <span className="text-zinc-500">L:</span>
                <span className="text-emerald-400 font-mono">{account.accountId}</span>
                <button
                  onClick={() => copyToClipboard(account.accountId || "", "Login")}
                  className="text-zinc-500 hover:text-emerald-400 ml-1"
                >
                  {copiedField === "Login" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              {/* Password */}
              <div className="flex items-center gap-1 bg-zinc-900/80 rounded px-2 py-1">
                <span className="text-zinc-500">P:</span>
                <span className="text-emerald-400 font-mono">
                  {showPassword ? account.password : "••••••"}
                </span>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-500 hover:text-emerald-400 ml-1"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => copyToClipboard(account.password || "", "Password")}
                  className="text-zinc-500 hover:text-emerald-400"
                >
                  {copiedField === "Password" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show credentials button when panel is hidden */}
        {!showCredentials && (
          <button
            onClick={() => setShowCredentials(true)}
            className="absolute bottom-2 left-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-white px-2 py-1 rounded text-xs z-10"
          >
            Show Credentials
          </button>
        )}
      </div>
    </div>
  );
}
