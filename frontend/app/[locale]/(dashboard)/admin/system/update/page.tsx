"use client";
import { useEffect, useRef } from "react";
import { TopBar } from "./top-bar";
import { UpdateInfo } from "./update-info";
import { UpdateActions } from "./update-actions";
import { LicenseVerification } from "./license-verification";
import { useSystemUpdateStore } from "@/store/update";

export default function SystemUpdatePage() {
  const {
    licenseVerified,
    fetchProductInfo,
    updateData,
    isUpdating,
    isUpdateChecking,
    checkForUpdates,
    updateSystem,
    productId,
    productVersion,
  } = useSystemUpdateStore();
  
  // Track whether update check has been performed to prevent infinite loops
  const updateCheckPerformedRef = useRef(false);
  
  useEffect(() => {
    fetchProductInfo();
  }, []);

  // Automatically check for updates when product info is loaded and license is verified
  // Only check once by using a ref to track if the check has been performed
  useEffect(() => {
    if (
      productId && 
      productVersion && 
      licenseVerified && 
      !isUpdateChecking && 
      !updateCheckPerformedRef.current
    ) {
      updateCheckPerformedRef.current = true;
      checkForUpdates();
    }
  }, [productId, productVersion, licenseVerified, checkForUpdates]);

  // Reset the update check flag when product info changes
  useEffect(() => {
    updateCheckPerformedRef.current = false;
  }, [productId, productVersion]);

  return (
    <>
      <TopBar />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          <UpdateInfo type="system" />
        </div>
        <div className="md:col-span-1 space-y-5">
          <UpdateActions
            updateData={updateData}
            licenseVerified={licenseVerified}
            isUpdating={isUpdating}
            isUpdateChecking={isUpdateChecking}
            checkForUpdates={checkForUpdates}
            updateAction={updateSystem}
            type="system"
          />
          {!licenseVerified && <LicenseVerification />}
        </div>
      </div>
    </>
  );
}
