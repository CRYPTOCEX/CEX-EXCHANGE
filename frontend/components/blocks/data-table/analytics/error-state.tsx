import React from "react";
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="text-center space-y-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={onRetry}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
};
