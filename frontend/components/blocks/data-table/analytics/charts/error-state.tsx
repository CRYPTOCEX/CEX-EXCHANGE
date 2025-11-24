import React from "react";
import { Card, CardContent } from "@/components/ui/card";
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
