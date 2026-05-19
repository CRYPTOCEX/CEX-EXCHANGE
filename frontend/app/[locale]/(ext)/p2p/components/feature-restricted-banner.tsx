import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
interface FeatureRestrictedBannerProps {
  title?: string;
  description?: string;
}

export function FeatureRestrictedBanner({
  title,
  description,
}: FeatureRestrictedBannerProps) {
  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50 text-blue-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-blue-300">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-300">{title || "Limited Access"}</AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-400">
        {description ||
          "Some features are restricted. Please sign in to access all P2P trading features."}
      </AlertDescription>
    </Alert>
  );
}
