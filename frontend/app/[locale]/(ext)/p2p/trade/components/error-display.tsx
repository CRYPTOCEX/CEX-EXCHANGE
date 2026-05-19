"use client";

import { AlertCircle, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  isRetrying,
}: ErrorDisplayProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: "#3b82f6" }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-15"
            style={{ backgroundColor: "#8b5cf6" }}
          />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                {t("my_trades")}
              </span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {t("manage_your_active_trades")}
            </p>
          </div>
        </div>
      </section>

      {/* Error Content */}
      <main className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-8 border border-zinc-200/50 dark:border-zinc-700/50 text-center">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>

            {/* Error Message */}
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
              {tCommon("something_went_wrong")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
              {error}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/p2p/trade">
                <Button variant="outline" className="w-full sm:w-auto border-zinc-300 dark:border-zinc-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {tExt("back_to_trades")}
                </Button>
              </Link>
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                className={`w-full sm:w-auto bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white disabled:opacity-50`}
              >
                {isRetrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {tCommon("try_again")}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
