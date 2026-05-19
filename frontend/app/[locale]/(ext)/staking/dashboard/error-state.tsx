"use client";

import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface DashboardErrorStateProps {
  error?: string;
  onRetry?: () => void;
}

export default function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md w-full text-center p-8 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          {tCommon('error_loading_dashboard')}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {t("we_encountered_an_error_while_loading_2")}
        </p>
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
            <p className="text-sm text-red-600 dark:text-red-400 font-mono">{error}</p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="rounded-xl bg-linear-to-r from-violet-600 via-indigo-500 to-violet-600 hover:shadow-xl text-white"
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
  );
}
