"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import ErrorBoundary from "@/components/error-boundary";
import { useTranslations } from "next-intl";

interface StakingErrorProps {
  error?: Error;
  reset?: () => void;
}

export function StakingError({ error, reset }: StakingErrorProps) {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          {t("staking_system_error")}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {t("we_encountered_an_error_while_loading_1")} {t("this_might_be_a_temporary_issue")}
        </p>
        {error?.message && (
          <div className="p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
            <p className="text-sm text-red-600 dark:text-red-400 font-mono">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          {reset && (
            <Button
              onClick={reset}
              className="rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-violet-700 hover:to-indigo-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tCommon("try_again")}
            </Button>
          )}
          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            className="rounded-xl"
          >
            <Home className="h-4 w-4 mr-2" />
            {tCommon("go_to_dashboard")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StakingErrorBoundaryProps {
  children: React.ReactNode;
}

export function StakingErrorBoundary({ children }: StakingErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <StakingError
          error={new Error("An unexpected error occurred in the staking system")}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}