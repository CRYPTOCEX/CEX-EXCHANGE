import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LaunchRequirements } from "@/app/[locale]/(ext)/ico/creator/launch/components/launch-requirements";
import { SteppedLaunchForm } from "@/app/[locale]/(ext)/ico/creator/launch/components/stepped-launch-form";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: "Launch Your Token | TokenLaunch",
  description: "Create and launch your own token offering on our platform",
};

export default function LaunchPage() {
  const t = useTranslations("ext");
  return (
    <div className="container pt-8 pb-20 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("launch_your_token")}
          </h1>
          <p className="text-muted-foreground">
            {t("create_and_launch_our_platform")}.{" "}
            {t("we_provide_the_you_succeed")}.
          </p>
        </div>
        <Link href="/ico/creator">
          <Button variant="secondary">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t("creator_dashboard")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="form">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="form">{t("launch_form")}</TabsTrigger>
              <TabsTrigger value="requirements">
                {t("Requirements")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="form">
              <SteppedLaunchForm />
            </TabsContent>
            <TabsContent value="requirements">
              <LaunchRequirements />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t("launch_process")}</CardTitle>
              <CardDescription>
                {t("how_to_launch_your_token_on_our_platform")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1:
                  </div>
                  <h3 className="font-medium">{t("submit_application")}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {t("fill_out_the_token_information")}.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <h3 className="font-medium">{t("Verification")}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {t("our_team_will_project_details")}.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <h3 className="font-medium">
                    {t("smart_contract_deployment")}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {t("once_approved_well_smart_contract")}.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <h3 className="font-medium">{t("offering_setup")}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {t("configure_your_token_marketing_materials")}.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    / 5
                  </div>
                  <h3 className="font-medium">{t("Launch")}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {t("your_token_offering_for_investors")}.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("need_help_with_the_way")}.
              </p>
              <Link href="/ico/contact" className="w-full">
                <button className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-md text-sm font-medium transition-colors">
                  {t("contact_support")}
                </button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
