"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import ErrorBoundary from "@/components/error-boundary";

interface StakingErrorProps {
  error?: Error;
  reset?: () => void;
}

export function StakingError({ error, reset }: StakingErrorProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Staking System Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We encountered an error while loading the staking information. This might be a temporary issue.
          </p>
          {error?.message && (
            <div className="p-3 bg-destructive/10 rounded-md">
              <p className="text-sm font-mono text-destructive">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            {reset && (
              <Button onClick={reset} variant="default" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            )}
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              size="sm"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
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