import { Suspense } from "react";
import { UserProfileClient } from "./client";
import { Loader2 } from "lucide-react";

function ProfilePageFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <UserProfileClient />
    </Suspense>
  );
}
