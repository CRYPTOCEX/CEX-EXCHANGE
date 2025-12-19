import { Loader2 } from "lucide-react";

export default function FollowLeaderLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen pt-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
