import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const t = useTranslations("common");
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {t("try_again")}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
