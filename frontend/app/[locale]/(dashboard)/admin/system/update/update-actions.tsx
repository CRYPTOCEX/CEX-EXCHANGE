"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface UpdateActionsProps {
  updateData: {
    status: boolean;
    update_id: string;
  };
  licenseVerified: boolean;
  isUpdating: boolean;
  isUpdateChecking: boolean;
  checkForUpdates: () => Promise<void>;
  updateAction: () => Promise<void>;
  type: "system" | "extension";
}

export function UpdateActions({
  updateData,
  licenseVerified,
  isUpdating,
  isUpdateChecking,
  checkForUpdates,
  updateAction,
  type,
}: UpdateActionsProps) {
  const t = useTranslations("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("update_actions")}</CardTitle>
        <CardDescription>
          {updateData.status
            ? `Update to the latest version of this ${type} once your license is verified.`
            : `No updates available for this ${type}, but you can re-check at any time.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUpdateChecking ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <Button
              onClick={updateAction}
              className="w-full"
              color="success"
              disabled={
                !updateData.status ||
                !licenseVerified ||
                updateData.update_id === "" ||
                isUpdating
              }
              aria-disabled={
                !updateData.status ||
                !licenseVerified ||
                updateData.update_id === "" ||
                isUpdating
              }
            >
              {isUpdating ? "Updating..." : "Update"}
            </Button>
            <Button
              onClick={checkForUpdates}
              className="w-full"
              disabled={isUpdateChecking}
              aria-disabled={isUpdateChecking}
            >
              {isUpdateChecking ? "Checking..." : "Check for Updates"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
