import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function OfferingLoading() {
  const t = useTranslations("ext");
  return (
    <div className="min-h-screen pb-24">
      {/* Hero section with gradient background */}
      <div className="relative overflow-hidden mb-12 min-h-[80vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-primary-foreground/5 z-0"></div>

        <div className="container mx-auto relative z-10 pt-8 pb-12">
          <Link
            href="/admin/ico/offer"
            className="text-sm text-background/70 hover:text-background mb-4 flex items-center w-fit"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("back_to_offerings")}
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Token Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-background/20 backdrop-blur-sm p-1 shadow-xl">
                <div className="w-full h-full rounded-xl overflow-hidden bg-background flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              </div>
              <Skeleton className="absolute -bottom-2 right-0 h-6 w-20 rounded-full" />
            </div>

            {/* Token Info */}
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <Skeleton className="h-10 w-64" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>

              <div className="mt-2 max-w-2xl">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6 mb-1" />
                <Skeleton className="h-4 w-4/6" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {/* Token Price */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{t("token_price")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>

                {/* Participants */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{t("Participants")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>

                {/* Start Date */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t("start_date")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-28" />
                  </div>
                </div>

                {/* End Date */}
                <div className="bg-background/10 backdrop-blur-sm rounded-lg p-3 border border-background/10">
                  <div className="text-background/70 text-sm flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t("end_date")}</span>
                  </div>
                  <div className="mt-1">
                    <Skeleton className="h-6 w-28" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8 bg-background/20 backdrop-blur-sm rounded-lg p-4 border border-background/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-background">
                  {t("fundraising_progress")}
                </h3>
                <Skeleton className="h-5 w-16 rounded-full" />
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
                  <span>{t("blockchain")}</span>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center gap-1.5 text-background/80">
                  <Star className="h-4 w-4" />
                  <span>{t("token_type")}</span>
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>

              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto flex flex-col gap-6">
        {/* Funding progress chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[500px] w-full rounded-md" />
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground border-t pt-4">
            <Skeleton className="h-4 w-96" />
          </CardFooter>
        </Card>

        {/* Key metrics and comparison */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <Skeleton className="h-4 w-80 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-baseline">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabbed content */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="pb-0">
            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start mb-6 bg-transparent p-0 h-auto">
                {[
                  "Overview",
                  "Token Details",
                  "Team",
                  "Roadmap",
                  "Updates",
                ].map((tab, i) => (
                  <TabsTrigger
                    key={i}
                    value={tab.toLowerCase().replace(" ", "-")}
                    className="rounded-md py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground/70"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-6">
                  <div>
                    <Skeleton className="h-6 w-40 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-2" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>

                  <div>
                    <Skeleton className="h-6 w-40 mb-3" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-md" />
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Activity timeline */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-16 w-1 mt-2" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="mt-2 flex gap-2">
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
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
