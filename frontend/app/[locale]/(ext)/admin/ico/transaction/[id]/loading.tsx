import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TransactionLoading() {
  const t = useTranslations("ext");
  return (
    <div className="container mx-auto pb-20 space-y-6 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground">
          <div className="flex items-center hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>{t("back_to_transactions")}</span>
          </div>
        </div>

        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96 mt-1" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("Refresh")}
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Overview Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-64 mt-1" />
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Transaction ID */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex items-center">
                  <Skeleton className="h-8 w-full max-w-[250px] rounded" />
                  <Skeleton className="h-6 w-6 rounded-full ml-2" />
                </div>
              </div>

              {/* Release URL */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex items-center">
                  <Skeleton className="h-8 w-full max-w-[250px] rounded" />
                  <Skeleton className="h-6 w-6 rounded-full ml-2" />
                  <Skeleton className="h-6 w-6 rounded-full ml-1" />
                </div>
              </div>

              {/* Amount & Price */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48 mt-1" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>

              {/* Wallet Address */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex items-center">
                  <Skeleton className="h-8 w-full max-w-[250px] rounded" />
                  <Skeleton className="h-6 w-6 rounded-full ml-2" />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Offering */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24 mt-1" />
                  </div>
                </div>
              </div>

              {/* Investor */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32 mt-1" />
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-48 ml-1" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-48 ml-1" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-48 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="related">
        <TabsList>
          <TabsTrigger value="related" disabled>
            {t("related_transactions")}
          </TabsTrigger>
          <TabsTrigger value="notes" disabled>
            {t("Notes")}
          </TabsTrigger>
        </TabsList>

        {/* Related Transactions Tab */}
        <TabsContent value="related" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-48" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-64" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-32" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-64" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-md">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-4 w-5/6 mt-2" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-[100px] w-full rounded" />
                <div className="mt-2 flex justify-end space-x-2">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
