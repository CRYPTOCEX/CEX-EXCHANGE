"use client";

import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemUpdateStore } from "@/store/update";
import { useExtensionStore } from "@/store/extension";
import { useTranslations } from "next-intl";
import { MarkdownRenderer, isMarkdownContent } from "@/lib/markdown-renderer";

interface UpdateInfoProps {
  type: "system" | "extension";
}

export function UpdateInfo({ type }: UpdateInfoProps) {
  const t = useTranslations("dashboard");
  const {
    updateData: systemUpdateData,
    isUpdateChecking: systemIsUpdateChecking,
  } = useSystemUpdateStore();
  const {
    updateData: extensionUpdateData,
    isUpdateChecking: extensionIsUpdateChecking,
    currentExtension,
  } = useExtensionStore();

  const updateData = type === "system" ? systemUpdateData : extensionUpdateData;
  const isUpdateChecking =
    type === "system" ? systemIsUpdateChecking : extensionIsUpdateChecking;
  const externalNotesUrl = "https://support.mash3div.com/pages/update-notes";

  const productName = type === "system" ? "Bicrypto" : currentExtension?.title;
  const noUpdateAvailable =
    !updateData.status &&
    updateData.message === `You have the latest version of ${productName}.`;
  const errorOrFallbackScenario =
    !updateData.status &&
    updateData.message !== `You have the latest version of ${productName}.` &&
    updateData.message !== "";

  if (isUpdateChecking) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
        </div>
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {updateData.status && (
        <div className="space-y-3">
          <Alert color="default" variant="soft">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {type === "system"
                ? "Please backup your database and script files before upgrading."
                : "Please backup your data before updating this extension."}
            </AlertDescription>
          </Alert>
          {updateData.message && (
            <Alert color="success" variant="soft">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{updateData.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {noUpdateAvailable && (
        <>
          <Alert color="success" variant="soft">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{updateData.message}</AlertDescription>
          </Alert>
          <Card>
            <CardContent className="p-5 space-y-5">
              <h3 className="text-xl font-semibold">{t("update_notes")}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("there_are_no_updates_available_for")}{" "}
                {type === "system" ? "your system" : "this extension"}
                {t("at_this_time")}.
              </p>
              <a
                href={externalNotesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-500 underline"
              >
                {t("view_changelog")}
              </a>
            </CardContent>
          </Card>
        </>
      )}

      {errorOrFallbackScenario && (
        <Alert color="warning" variant="soft">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {updateData.message ||
              `Unable to retrieve update information for ${type === "system" ? "the system" : "this extension"}.`}
          </AlertDescription>
        </Alert>
      )}

      {updateData.status && updateData.changelog && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <h3 className="text-xl font-semibold">{t("update_notes")}</h3>
            <div className="overflow-auto max-h-96">
              {isMarkdownContent(updateData.changelog) ? (
                <MarkdownRenderer 
                  content={updateData.changelog} 
                  className="text-sm"
                />
              ) : (
                <div
                  className="pl-5 prose dark:prose-invert text-sm"
                  dangerouslySetInnerHTML={{
                    __html: updateData.changelog || "",
                  }}
                />
              )}
            </div>
            <a
              href={externalNotesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              {t("view_full_changelog")}
            </a>
          </CardContent>
        </Card>
      )}
    </>
  );
}
