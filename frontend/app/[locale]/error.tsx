"use client"; // Error components must be Client Components

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "@/i18n/routing";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Log the error details
    console.error("Page error boundary caught:", error);

    // Add global error handler for unhandled rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      event.preventDefault(); // Prevent the default browser behavior
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with icon */}
          <div className="bg-destructive/10 p-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-center">
              {t("something_went_wrong")}
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {t("an_error_occurred_while_loading_the_page")}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Error details (development only) */}
            {process.env.NODE_ENV === "development" && (
              <div className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>Error Details (Dev Only)</span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showDetails && (
                  <div className="px-4 py-3 bg-muted/30 border-t border-border">
                    <pre className="text-xs text-destructive overflow-auto max-h-40 whitespace-pre-wrap break-all">
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
                className="w-full"
                size="lg"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isRetrying ? "Retrying..." : t("try_again")}
              </Button>
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  <Home className="w-4 h-4 mr-2" />
                  {t("go_home")}
                </Button>
              </Link>
            </div>

            {/* Help text */}
            <p className="text-xs text-center text-muted-foreground">
              If the problem persists, try refreshing the page or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
