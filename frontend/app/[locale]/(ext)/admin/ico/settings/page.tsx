"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlockchainConfiguration from "./components/blockchain";
import TokenTypeConfiguration from "./components/type";
import PlatformSettingsConfiguration from "./components/platform";
import LaunchPlansConfiguration from "./components/launch/plan";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DirtyFormProvider, useDirtyForm } from "@/context/dirty-form-context";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

function ConfigurationsPage() {
  const t = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam &&
      [
        "blockchains",
        "token-types",
        "launch-plans",
        "platform-settings",
      ].includes(tabParam)
      ? tabParam
      : "blockchains"
  );
  const { isDirty, setDirty } = useDirtyForm();
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleTabChange = (newTab: string) => {
    if (isDirty && newTab !== activeTab) {
      setPendingTab(newTab);
      setShowConfirm(true);
      return;
    }
    // No unsaved changes: switch immediately.
    setDirty(false);
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`?${params.toString()}`, { scroll: false });
  };
  const confirmTabChange = () => {
    setShowConfirm(false);
    setDirty(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", pendingTab);
      router.push(`?${params.toString()}`, { scroll: false });
      setPendingTab(null);
    }
  };
  const cancelTabChange = () => {
    setShowConfirm(false);
    setPendingTab(null);
  };
  useEffect(() => {
    if (
      tabParam &&
      [
        "blockchains",
        "token-types",
        "launch-plans",
        "platform-settings",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("platform_configurations")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("manage_all_platform_platform_settings")}.
        </p>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="blockchains">{t("Blockchains")}</TabsTrigger>
          <TabsTrigger value="token-types">{t("token_types")}</TabsTrigger>
          <TabsTrigger value="launch-plans">{t("launch_plans")}</TabsTrigger>
          <TabsTrigger value="platform-settings">
            {t("platform_settings")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="blockchains" className="space-y-4">
          <BlockchainConfiguration />
        </TabsContent>
        <TabsContent value="token-types" className="space-y-4">
          <TokenTypeConfiguration />
        </TabsContent>
        <TabsContent value="launch-plans" className="space-y-4">
          {/* Pass isActive to let the launch plan form reset when its tab is inactive */}
          <LaunchPlansConfiguration isActive={activeTab === "launch-plans"} />
        </TabsContent>
        <TabsContent value="platform-settings" className="space-y-4">
          <PlatformSettingsConfiguration />
        </TabsContent>
      </Tabs>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discard_unsaved_changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("you_have_unsaved_changes")}. {t("are_you_sure_switch_tabs")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTabChange}>
              {t("No")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabChange} variant="destructive">
              {t("yes_discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
export default function ConfigurationsPageWithDirtyCheck() {
  return (
    <DirtyFormProvider>
      <ConfigurationsPage />
    </DirtyFormProvider>
  );
}
