"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";

export default function IcoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  const tIco = useTranslations("ext_ico");
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error("ICO page error:", error);
  }, [error]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      reset();
    } finally {
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 p-8 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-4 ring-4 ring-destructive/10">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-center">
              {t("something_went_wrong")}
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
              {t("an_error_occurred_while_loading_the_page")}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Error details (development only) */}
            {process.env.NODE_ENV === "development" && (
              <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">Error Details</span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showDetails && (
                  <div className="px-4 py-3 bg-muted/30 border-t border-border">
                    <pre className="text-xs text-destructive overflow-auto max-h-48 whitespace-pre-wrap break-all font-mono">
                      {error.message}
                      {error.stack && `\n\n${error.stack}`}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full h-12"
                size="lg"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isRetrying ? "Retrying..." : t("try_again")}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Link href="/ico" className="w-full">
                  <Button variant="outline" className="w-full h-11" size="default">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    ICO Home
                  </Button>
                </Link>
                <Link href="/" className="w-full">
                  <Button variant="outline" className="w-full h-11" size="default">
                    <Home className="w-4 h-4 mr-2" />
                    {t("go_home")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Help text */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              If this keeps happening, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
