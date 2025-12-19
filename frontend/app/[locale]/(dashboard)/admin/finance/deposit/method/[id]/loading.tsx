import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Percent,
  ArrowDownCircle,
  ArrowUpCircle,
  Shield,
  Layers,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function DepositMethodLoading() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen pt-20 pb-24">
      {/* Hero section with gradient background */}
      <div className="relative overflow-hidden mb-6 min-h-[60vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-primary-foreground/5 z-0"></div>

        <div className="container mx-auto relative z-10 pt-8 pb-12">
          <Link
            href="/admin/finance/deposit/method"
            className="text-sm text-background/70 hover:text-background mb-4 flex items-center w-fit"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("back_to_methods")}
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Method Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-background/20 backdrop-blur-sm p-1 shadow-xl">
                <div className="w-full h-full rounded-xl overflow-hidden bg-background flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              </div>
              <Skeleton className="absolute -bottom-2 right-0 h-6 w-16 rounded-full" />
            </div>

            {/* Method Info */}
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <Skeleton className="h-10 w-64" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>

              <div className="mt-2 max-w-2xl">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6 mb-1" />
                <Skeleton className="h-4 w-4/6" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {/* Fixed Fee */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{tCommon("fixed_fee")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>

                {/* Percentage Fee */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5" />
                    <span>{tCommon("percentage_fee")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>

                {/* Min Amount */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <ArrowDownCircle className="h-3.5 w-3.5" />
                    <span>{tCommon("min_amount")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>

                {/* Max Amount */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    <span>{tCommon("max_amount")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Overview Card */}
          <div className="mt-8 bg-background/20 backdrop-blur-sm rounded-lg p-4 border border-background/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-background">
                  {t("fee_structure_overview")}
                </h3>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />

            <div className="flex flex-wrap gap-4 mt-4 justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-background/80">
                  <Shield className="h-4 w-4" />
                  <span>{tCommon("custom_fields")}</span>
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex items-center gap-1.5 text-background/80">
                  <Layers className="h-4 w-4" />
                  <span>{tCommon("status")}</span>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto flex flex-col gap-6">
        {/* Admin Actions Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Fee Breakdown Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-72 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-32 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-4 w-36 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground border-t pt-4">
            <Skeleton className="h-4 w-80" />
          </CardFooter>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-56 mt-1" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-4/6 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>

        {/* Custom Fields Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <div>
                        <Skeleton className="h-6 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-6 w-14 rounded-md" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-52 mt-1" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    {i === 0 && <Skeleton className="h-8 w-0.5 mt-2" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
