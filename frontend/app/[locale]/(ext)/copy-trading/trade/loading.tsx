import { Loader2 } from "lucide-react";

export default function TradeHistoryLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 bg-linear-to-b from-background to-muted/20 dark:from-zinc-950 dark:to-zinc-900/50">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
      </div>
    </div>
  );
}
