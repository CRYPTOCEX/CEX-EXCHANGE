"use client";

import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface PositionsErrorStateProps {
  error?: string;
  onRetry?: () => void;
}

export default function PositionsErrorState({
  error,
  onRetry,
}: PositionsErrorStateProps) {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <div className="relative overflow-hidden pt-28 pb-12"></div>

      <div className="container mx-auto">
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="max-w-md w-full text-center p-8 rounded-2xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-violet-200/50 dark:border-violet-800/50 shadow-xl">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
              {t("error_loading_positions")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {t("we_encountered_an_error_while_loading_5")}
            </p>
            {error && (
              <div className="p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
                <p className="text-sm text-red-600 dark:text-red-400 font-mono">
                  {error}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {tCommon("try_again")}
                </Button>
              )}
              <Link href="/staking">
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("back_to_staking")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
