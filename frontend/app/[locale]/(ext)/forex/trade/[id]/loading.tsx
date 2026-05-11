import { Loader2 } from "lucide-react";

export default function TradeLoading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
        <p className="text-zinc-400">Loading trading terminal...</p>
      </div>
    </div>
  );
}
