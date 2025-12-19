"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Wallet,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import {
  DESIGN_NAMES,
  type CheckoutDesignVariant,
} from "@/app/[locale]/(ext)/gateway/checkout/[paymentIntentId]/designs";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

type ViewportSize = "mobile" | "tablet" | "desktop" | "full";
type PreviewState =
  | "loading"
  | "not_authenticated"
  | "wallet_loading"
  | "sufficient_balance"
  | "insufficient_balance"
  | "no_wallet"
  | "multi_wallet"
  | "processing"
  | "success"
  | "error";

const VIEWPORT_SIZES: Record<
  ViewportSize,
  { width: number; height: number; icon: React.ReactNode; label: string }
> = {
  mobile: {
    width: 375,
    height: 700,
    icon: <Smartphone className="w-4 h-4" />,
    label: "Mobile",
  },
  tablet: {
    width: 768,
    height: 1024,
    icon: <Tablet className="w-4 h-4" />,
    label: "Tablet",
  },
  desktop: {
    width: 1280,
    height: 800,
    icon: <Monitor className="w-4 h-4" />,
    label: "Desktop",
  },
  full: {
    width: 0,
    height: 0,
    icon: <Monitor className="w-4 h-4" />,
    label: "Full Width",
  },
};

const PREVIEW_STATES: Record<
  PreviewState,
  { label: string; icon: React.ReactNode; description: string }
> = {
  loading: {
    label: "Loading",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    description: "Initial page load",
  },
  not_authenticated: {
    label: "Not Logged In",
    icon: <User className="w-4 h-4" />,
    description: "User needs to sign in",
  },
  wallet_loading: {
    label: "Loading Wallet",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    description: "Fetching wallet balance",
  },
  sufficient_balance: {
    label: "Ready to Pay",
    icon: <Wallet className="w-4 h-4" />,
    description: "User has enough balance",
  },
  insufficient_balance: {
    label: "Low Balance",
    icon: <AlertTriangle className="w-4 h-4" />,
    description: "Need to add funds",
  },
  no_wallet: {
    label: "No Wallet",
    icon: <XCircle className="w-4 h-4" />,
    description: "Wallet not found",
  },
  multi_wallet: {
    label: "Multi-Wallet",
    icon: <Layers className="w-4 h-4" />,
    description: "Paying from multiple wallets",
  },
  processing: {
    label: "Processing",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    description: "Payment in progress",
  },
  success: {
    label: "Success",
    icon: <CheckCircle className="w-4 h-4" />,
    description: "Payment completed",
  },
  error: {
    label: "Error",
    icon: <XCircle className="w-4 h-4" />,
    description: "Payment failed",
  },
};

export default function DesignClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const initialDesign =
    (searchParams.get("design") as CheckoutDesignVariant) || "v2";

  const [selectedDesign, setSelectedDesign] =
    useState<CheckoutDesignVariant>(initialDesign);
  const [viewport, setViewport] = useState<ViewportSize>("full");
  const [previewState, setPreviewState] =
    useState<PreviewState>("sufficient_balance");
  const [iframeKey, setIframeKey] = useState(0);

  // Force iframe reload when design or state changes
  useEffect(() => {
    setIframeKey((prev) => prev + 1);
  }, [selectedDesign, previewState]);

  const previewUrl = `/admin/gateway/settings/design/preview?design=${selectedDesign}&state=${previewState}`;

  return (
    <div className={`min-h-screen bg-muted/30 flex flex-col`}>
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-4">
            <Link href="/admin/gateway/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-semibold">{t("checkout_design")}</h1>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-4">
            {/* Design Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("design")}:
              </span>
              <Select
                value={selectedDesign}
                onValueChange={(v) =>
                  setSelectedDesign(v as CheckoutDesignVariant)
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DESIGN_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Viewport Selector */}
            <div className="flex items-center gap-1">
              {Object.entries(VIEWPORT_SIZES).map(([key, { icon, label }]) => (
                <Button
                  key={key}
                  variant={viewport === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewport(key as ViewportSize)}
                  title={label}
                >
                  {icon}
                </Button>
              ))}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* State Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("state")}:
              </span>
              <Select
                value={previewState}
                onValueChange={(v) => setPreviewState(v as PreviewState)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PREVIEW_STATES).map(
                    ([key, { label, icon, description }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {icon}
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-muted-foreground">
                              {description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1">
              {PREVIEW_STATES[previewState].icon}
              {PREVIEW_STATES[previewState].label}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewState("sufficient_balance")}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Viewport indicator */}
        {viewport !== "full" && (
          <div className="bg-muted/50 border-t px-4 py-1.5 text-center">
            <span className="text-xs text-muted-foreground">
              {t("viewport")}: {VIEWPORT_SIZES[viewport].label} (
              {VIEWPORT_SIZES[viewport].width}
              {tCommon("px")} {VIEWPORT_SIZES[viewport].height}
              {tCommon("px")}
            </span>
          </div>
        )}
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        {viewport === "full" ? (
          <iframe
            key={iframeKey}
            src={previewUrl}
            className="w-full border-0 rounded-lg shadow-2xl bg-background"
            style={{
              height: "calc(100vh - 120px)",
            }}
          />
        ) : (
          <div
            className="bg-zinc-800 rounded-[2rem] p-3 shadow-2xl"
            style={{
              width: VIEWPORT_SIZES[viewport].width + 24,
            }}
          >
            {/* Device frame header */}
            <div className="flex items-center justify-center mb-2">
              <div className="w-20 h-1.5 bg-zinc-700 rounded-full" />
            </div>
            {/* Iframe container */}
            <div
              className="rounded-2xl overflow-hidden bg-background"
              style={{
                width: VIEWPORT_SIZES[viewport].width,
                height: VIEWPORT_SIZES[viewport].height,
              }}
            >
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full border-0"
                style={{
                  width: VIEWPORT_SIZES[viewport].width,
                  height: VIEWPORT_SIZES[viewport].height,
                }}
              />
            </div>
            {/* Device frame footer */}
            <div className="flex items-center justify-center mt-2">
              <div className="w-10 h-10 bg-zinc-700 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
