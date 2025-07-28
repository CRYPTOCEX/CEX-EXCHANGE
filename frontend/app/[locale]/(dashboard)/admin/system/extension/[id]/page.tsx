"use client";
import React, { useEffect, useRef } from "react";
import { TopBar } from "./top-bar";
import { UpdateInfo } from "../../update/update-info";
import { UpdateActions } from "../../update/update-actions";
import { LicenseVerification } from "../license-verification";
import { useExtensionStore } from "@/store/extension";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function ExtensionDetailsPage() {
  const t = useTranslations("dashboard");
  const { id } = useParams();
  const updateCheckedRef = useRef<string | null>(null);
  const {
    extensions,
    currentExtension,
    setCurrentExtension,
    licenseVerified,
    isLoading,
    fetchExtensions,
    updateData,
    isUpdating,
    isUpdateChecking,
    checkForUpdates,
    updateExtension,
  } = useExtensionStore();
  
  useEffect(() => {
    if (id && extensions.length === 0) {
      fetchExtensions();
    }
  }, [id, extensions.length, fetchExtensions]);
  
  useEffect(() => {
    if (id && extensions.length > 0) {
      const extension = extensions.find((ext) => ext.productId === id);
      if (extension) {
        setCurrentExtension(extension);
        // Reset the update check tracking when extension changes
        updateCheckedRef.current = null;
      }
    }
  }, [id, extensions, setCurrentExtension]);

  // Check for updates only once when extension is loaded and license is verified
  useEffect(() => {
    if (
      currentExtension && 
      licenseVerified && 
      !isUpdateChecking && 
      updateCheckedRef.current !== currentExtension.productId
    ) {
      updateCheckedRef.current = currentExtension.productId;
      checkForUpdates();
    }
  }, [currentExtension, licenseVerified, checkForUpdates]);
  if (isLoading || !currentExtension) {
    return (
      <div>
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="md:col-span-1 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <TopBar extension={currentExtension} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("extension_details")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Image
                  src={currentExtension.image || "/img/placeholder.svg"}
                  alt={currentExtension.title}
                  width={64}
                  height={64}
                  className="rounded-lg"
                />
                <div>
                  <h2 className="text-2xl font-bold">
                    {currentExtension.title}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("version")}
                    {currentExtension.version}
                  </p>
                </div>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400">
                {currentExtension.description}
              </p>
            </CardContent>
          </Card>
          <UpdateInfo type="extension" />
        </div>
        <div className="md:col-span-1 space-y-6">
          <UpdateActions
            updateData={updateData}
            licenseVerified={licenseVerified}
            isUpdating={isUpdating}
            isUpdateChecking={isUpdateChecking}
            checkForUpdates={checkForUpdates}
            updateAction={updateExtension}
            type="extension"
          />
          {!licenseVerified && <LicenseVerification />}
        </div>
      </div>
    </div>
  );
}
