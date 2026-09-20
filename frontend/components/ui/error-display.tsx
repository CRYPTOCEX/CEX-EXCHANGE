"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    // Ink on a TINTED ground, not on the raw page: `text-destructive` over
    // `bg-destructive/10` measured ~4.0:1 in light mode. `--destructive-ink` is
    // the derived pairing (see globals.css) and is what Badge's soft appearance
    // uses, so this box now matches every other tonal surface.
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive-ink">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium">{t("error_loading_data")}</h3>
          {/* Was `text-destructive/90` — an alpha on ink that already sits on a
              tint compounds the contrast loss. The message is the payload here;
              it does not want to be quieter than its own heading. */}
          <p className="text-sm mt-1">{error}</p>

          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-destructive/30 hover:bg-destructive/15"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tCommon("retry")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
