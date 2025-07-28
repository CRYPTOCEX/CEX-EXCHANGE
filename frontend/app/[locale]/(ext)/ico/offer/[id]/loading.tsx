import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function OfferingLoading() {
  const t = useTranslations("ext");
  return (
    <>
      {/* Hero Section with Background */}
      <div className="relative bg-gradient-to-b from-primary/10 to-background pt-8 pb-6">
        <div className="container">
          <Link
            href="/ico/offer"
            className="text-sm text-muted-foreground hover:text-primary mb-4 flex items-center w-fit"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("back_to_offerings")}
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-2/3">
              <div className="flex items-center gap-5 mb-4">
                <div className="bg-primary/10 p-1 rounded-full h-24 w-24 flex items-center justify-center">
                  <Skeleton className="h-20 w-20 rounded-full" />
                </div>
                <div>
                  <Skeleton className="h-10 w-64 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              <Skeleton className="h-4 w-full max-w-3xl mb-2" />
              <Skeleton className="h-4 w-5/6 max-w-3xl mb-2" />
              <Skeleton className="h-4 w-4/6 max-w-3xl mb-2" />

              <div className="flex flex-wrap gap-4 mt-6">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-36" />
              </div>
            </div>

            <div className="w-full md:w-1/3 mt-4 md:mt-0">
              <Card className="bg-card/70 backdrop-blur-sm border-primary/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {t("funding_progress")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <div className="flex justify-between mt-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-background/50 p-3 rounded-lg">
                        <Skeleton className="h-3 w-20 mb-1" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <div className="bg-background/50 p-3 rounded-lg">
                        <Skeleton className="h-3 w-20 mb-1" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-primary/5 border-0">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-5 mb-2" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-5 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Information Tabs */}
            <Card className="border-0 shadow-md mb-8">
              <Tabs defaultValue="details" className="w-full">
                <CardHeader className="pb-0">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">
                      {t("project_details")}
                    </TabsTrigger>
                    <TabsTrigger value="team">{t("Team")}</TabsTrigger>
                    <TabsTrigger value="roadmap">{t("Roadmap")}</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-6">
                  <TabsContent value="details" className="space-y-6">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-5/6 mb-1" />
                      <Skeleton className="h-4 w-4/6 mb-4" />

                      <Skeleton className="h-6 w-48 mb-2" />
                      <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            {/* FAQ Section */}
            <Card className="border-0 shadow-md mb-8">
              <CardHeader>
                <CardTitle>{t("frequently_asked_questions")}</CardTitle>
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-px w-full bg-border" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Investment Form Column */}
          <div className="space-y-6">
            {/* Sticky Investment Form */}
            <div id="invest" className="sticky top-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("invest_in_this_offering")}</CardTitle>
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>

              {/* Trust Indicators */}
              <Card className="mt-6 border-0 bg-muted/30">
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-40 mb-3" />
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-start">
                        <Skeleton className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Feed */}
              <Card className="mt-6 border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {t("recent_activity")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                        <div>
                          <Skeleton className="h-4 w-40 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
