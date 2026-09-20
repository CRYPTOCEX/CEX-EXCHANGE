import { Loader2 } from "lucide-react";

export default function AffiliateNetworkLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
      </div>
    </div>
  );
}
