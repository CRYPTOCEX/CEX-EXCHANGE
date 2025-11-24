import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export function LoadingState() {
  const t = useTranslations("ext");
  return (
    <div className="container max-w-7xl mx-auto py-12">
      <div className="flex items-center mb-8">
        <Link href="/p2p/offer" className="mr-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_to_offers")}
          </Button>
        </Link>
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    </div>
  );
}
