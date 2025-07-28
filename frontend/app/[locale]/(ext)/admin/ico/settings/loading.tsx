import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

export default function ConfigurationsLoading() {
  const t = useTranslations("ext");
  return (
    <div className="container mx-auto py-8">
      <Skeleton className="h-10 w-64 mb-6" />

      <Tabs defaultValue="blockchains" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="blockchains">{t("Blockchains")}</TabsTrigger>
          <TabsTrigger value="token-types">{t("token_types")}</TabsTrigger>
          <TabsTrigger value="platform-settings">
            {t("platform_settings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blockchains">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-40" />

                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 border rounded-md"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 ml-4">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
