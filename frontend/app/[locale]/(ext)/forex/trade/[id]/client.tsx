"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useForexStore } from "@/store/forex/user";
import { AlertCircle, ArrowLeft, Maximize2, Minimize2, Copy, Check, Eye, EyeOff, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function TradeClient() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
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
      toast.success(t("copied_to_clipboard", { field: String(field) }));
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error(tCommon("failed_to_copy"));
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
        setError(t("account_not_found"));
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

  /*
    THE WAITING STATE IS THIS PAGE, NOT A DIFFERENT ONE.

    What used to be here: `if (isLoading) return <full-viewport spinner>`. A
    `h-screen w-full` centred `Loader2` reserves nothing — it is 100% of the
    eventual layout arriving as shift. Concretely, the real page is a 44px
    header bar pinned to the top of the viewport with the broker, account id,
    balance and leverage in it, then a `flex-1` terminal frame taking the rest
    (~900px on a 1080p screen). The spinner put a 48px icon in the MIDDLE of
    that same viewport, so on arrival the header snapped from y=516 to y=0 and
    the terminal materialised beneath it: every pixel of chrome moved.

    None of that chrome depends on the fetch. The back button, the divider, the
    three right-hand labels ("Account" / "Balance" / "Leverage"), the reload,
    new-tab and fullscreen buttons and the frame that holds the iframe are all
    knowable before `fetchAccounts()` resolves. Only five VALUES are not, and
    each of those now sits in a `Loadable` inside the element that carries its
    own typography, so the header measures the same in both states.

    The terminal frame keeps its box too: the iframe's `src` genuinely cannot be
    built without the account (it is `?servers=<broker>&login=<id>`), so the
    frame holds a `SkeletonBlock` carrying the iframe's OWN sizing classes until
    the URL exists. That is the one thing on this page with no text metrics, so
    it is the one thing that should be a raw block.
  */
  const isPending = isLoading || !account;

  /*
    LOADING IS NOT THE SAME STATE AS "NOT FOUND", AND IT WAS.

    Both terminal screens below used to be reachable mid-fetch — `!account` is
    true on the first render for every visitor, and `!account.status` threw on
    it — so the page's honest first paint was "Account not found". The spinner
    was the only thing hiding that. Now that the page renders during the fetch,
    each terminal state has to wait for the fetch to have actually finished
    before it makes its claim.

    Hoisted into named conditions rather than left inline, because these are
    genuinely different SCREENS — an error and a moderation notice — not the
    pending version of this one, and naming them says so at the call site.
  */
  const notFound = !isLoading && (error || !account);
  const awaitingApproval = !isLoading && !!account && !account.status;

  if (notFound) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface-2">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {error || t("account_not_found")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("unable_to_load_the_trading_terminal")}
          </p>
          <Button
            onClick={() => router.push("/forex/dashboard")}
            variant="outline"
            className="border-border-strong text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("back_to_dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  if (awaitingApproval) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface-2">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {tExt("account_pending_approval")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("this_account_is_not_yet_active")}
          </p>
          <Button
            onClick={() => router.push("/forex/dashboard")}
            variant="outline"
            className="border-border-strong text-muted-foreground hover:bg-muted"
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
  const mtVersion = account?.mt === 5 ? "mt5" : "mt4";
  const server = encodeURIComponent(account?.broker || "");
  const login = encodeURIComponent(account?.accountId || "");

  // MetaTrader Web Terminal URL (using MetaQuotes official web terminal)
  // Note: The actual URL format depends on the broker's web terminal setup
  // Common formats:
  // 1. MetaQuotes Trade: https://trade.mql5.com/trade?servers=BrokerServer&login=12345
  // 2. Broker-specific: https://broker.com/webterminal?server=Server&login=12345

  const webTerminalUrl = account?.mt === 5
    ? `https://trade.mql5.com/trade?servers=${server}&login=${login}`
    : `https://metatraderweb.app/trade?servers=${server}&login=${login}`;

  return (
    <div className={`h-screen w-full flex flex-col bg-surface-2 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border-strong">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/forex/dashboard")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {/* The divider was `bg-muted` inside a `bg-muted` bar — the same
              colour on itself, so it never rendered. */}
          <div className="h-6 w-px bg-border-strong" />
          <div className="flex items-center gap-3">
            {/* The dot is 8x8 in every state, so only its HUE waits. Painting
                it `bg-warning` while the fetch is in flight would have claimed
                the account was pending approval before we knew anything. */}
            <div className={`w-2 h-2 rounded-full ${isPending ? "bg-muted-foreground/40" : account.status ? "bg-success" : "bg-warning"}`} />
            {/* This bar is `bg-muted`, a page surface — its ink is
                `foreground`. `primary-foreground` is the ink for a filled
                accent ground and is near-black in the dark theme, which is
                what made the broker name, account id and leverage below
                disappear into the header. */}
            <span className="text-foreground font-medium">
              <Loadable loading={isPending} placeholder={t("brokerserver_mt5")}>
                {account ? t("mt", { broker: String(account.broker), mt: String(account.mt) }) : null}
              </Loadable>
            </span>
            {/* The badge chip keeps its padding, radius and text size in both
                states; only the word inside it is unknown. Its GROUND cannot be
                chosen yet without asserting LIVE-or-DEMO, so it takes the
                neutral surface until the answer arrives. */}
            <span className={`px-2 py-0.5 text-xs rounded ${isPending ? "bg-surface-3 text-muted-foreground" : account.type === "LIVE" ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}>
              <Loadable loading={isPending} placeholder="DEMO">
                {account?.type}
              </Loadable>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Three label/value pairs. The LABELS are constants — they were
              being withheld along with the figures purely because the whole
              header lived behind the spinner. Each figure is `font-mono` here
              (or reads as one), so a same-character-count placeholder is
              exactly as wide and the group does not re-rag when the numbers
              land. */}
          <div className="text-right">
            <p className="text-xs text-subtle-foreground">Account</p>
            <p className="text-sm text-foreground font-mono">
              <Loadable loading={isPending} placeholder="12345678">{account?.accountId}</Loadable>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-subtle-foreground">Balance</p>
            <p className="text-sm text-success font-medium">
              <Loadable loading={isPending} placeholder="$10,000.00">
                {account
                  ? `$${parseFloat(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : null}
              </Loadable>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-subtle-foreground">Leverage</p>
            {/* "1:" is chrome — the ratio prefix is the same for every account
                — so only the multiplier waits. */}
            <p className="text-sm text-foreground">
              1:<Loadable loading={isPending} placeholder="500">{account?.leverage}</Loadable>
            </p>
          </div>
          <Button
            onClick={reloadTerminal}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-surface-2"
            title={t("reload_terminal")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={openInNewTab}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-surface-2"
            title={t("open_in_new_tab")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-surface-2"
            title={t("toggle_fullscreen")}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Trading terminal iframe */}
      <div className="flex-1 relative">
        {/*
          The one genuinely shapeless thing on the page, so the one place a raw
          block is the right primitive.

          The URL is `?servers=<broker>&login=<accountId>` — it cannot be built
          before the account arrives, and mounting an iframe on a half-built URL
          would make MetaQuotes serve an error page and then reload it. So the
          frame waits, and the placeholder carries the IFRAME'S OWN sizing
          classes (`w-full h-full`) rather than an invented height, which is the
          rule for `SkeletonBlock`: it cannot measure itself, so it has to be
          given the real element's box.
        */}
        {account ? (
          <iframe
            key={iframeKey}
            src={webTerminalUrl}
            className="w-full h-full border-0"
            allow="fullscreen; clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <SkeletonBlock className="w-full h-full rounded-none" />
        )}

        {/* Compact credentials panel - bottom left to avoid blocking terminal UI */}
        {showCredentials && (
          <div className="absolute bottom-2 left-2 bg-muted/95 backdrop-blur-sm rounded-lg p-2 border border-border-strong shadow-xl text-xs z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-muted-foreground">{t("credentials")}:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCredentials(false)}
                className="h-4 w-4 p-0 text-subtle-foreground hover:text-foreground ml-auto"
              >
                ×
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {/* Server */}
              <div className="flex items-center gap-1 bg-surface-2/80 rounded px-2 py-1">
                <span className="text-subtle-foreground">S:</span>
                {/* All three chips are `font-mono`, so a placeholder of the same
                    character count is exactly as wide and the row does not
                    re-rag as the credentials land. */}
                <span className="text-success font-mono">
                  <Loadable loading={isPending} placeholder="BrokerServer">{account?.broker}</Loadable>
                </span>
                <button
                  onClick={() => copyToClipboard(account?.broker || "", "Server")}
                  className="text-subtle-foreground hover:text-success ml-1"
                >
                  {copiedField === "Server" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              {/* Login */}
              <div className="flex items-center gap-1 bg-surface-2/80 rounded px-2 py-1">
                <span className="text-subtle-foreground">L:</span>
                <span className="text-success font-mono">
                  <Loadable loading={isPending} placeholder="12345678">{account?.accountId}</Loadable>
                </span>
                <button
                  onClick={() => copyToClipboard(account?.accountId || "", "Login")}
                  className="text-subtle-foreground hover:text-success ml-1"
                >
                  {copiedField === "Login" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              {/* Password */}
              <div className="flex items-center gap-1 bg-surface-2/80 rounded px-2 py-1">
                <span className="text-subtle-foreground">P:</span>
                <span className="text-success font-mono">
                  <Loadable loading={isPending} placeholder="••••••">
                    {showPassword ? account?.password : "••••••"}
                  </Loadable>
                </span>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-subtle-foreground hover:text-success ml-1"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => copyToClipboard(account?.password || "", "Password")}
                  className="text-subtle-foreground hover:text-success"
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
            className="absolute bottom-2 left-2 bg-muted/90 hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-1 rounded text-xs z-10"
          >
            {t("show_credentials")}
          </button>
        )}
      </div>
    </div>
  );
}
