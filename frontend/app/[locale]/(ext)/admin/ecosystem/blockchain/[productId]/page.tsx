"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";
// shadcn‑UI components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MarkdownRenderer, isMarkdownContent } from "@/lib/markdown-renderer";

interface UpdateData {
  status: boolean;
  message: string;
  changelog: string | null;
  update_id: string;
  version: string;
}
export default function BlockchainDetailsPage() {
  const t = useTranslations("ext");
  const router = useRouter();
  const { productId } = useParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  // Local state
  const [blockchainVersion, setBlockchainVersion] = useState("");
  const [blockchainName, setBlockchainName] = useState<string | null>(null);
  const [blockchainChain, setBlockchainChain] = useState<string | null>(null);
  const [blockchainStatus, setBlockchainStatus] = useState(false);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData>({
    status: false,
    message: "",
    changelog: null,
    update_id: "",
    version: "",
  });
  const [purchaseCode, setPurchaseCode] = useState("");
  const [envatoUsername, setEnvatoUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdateChecking, setIsUpdateChecking] = useState(false);
  // For the Vault passphrase dialog
  const [isPassPhraseDialogOpen, setIsPassPhraseDialogOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  // Updated skeleton class using default zinc tokens
  const skeletonClass = isDark
    ? "bg-zinc-700 animate-pulse"
    : "bg-zinc-200 animate-pulse";
  useEffect(() => {
    if (!productId) return;
    fetchBlockchainData();
  }, [productId]);
  const fetchBlockchainData = async () => {
    try {
      const { data: bcData, error: bcError } = await $fetch({
        url: `/api/admin/ecosystem/blockchain/${productId}`,
        silentSuccess: true,
      });
      if (!bcError && bcData) {
        setBlockchainVersion(bcData.version || "");
        setBlockchainName(bcData.name || null);
        setBlockchainChain(bcData.chain || null);
        setBlockchainStatus(bcData.status || false);
      }
      let verified = false;
      if (bcData?.name) {
        const { data: licData } = await $fetch({
          url: `/api/admin/system/license/verify`,
          method: "POST",
          body: { productId },
          silentSuccess: true,
        });
        verified = licData?.status ?? false;
      }
      setLicenseVerified(verified);
      if (verified && bcData?.version) {
        const { data: updData } = await $fetch({
          url: `/api/admin/system/update/check`,
          method: "POST",
          body: { productId, currentVersion: bcData.version },
          silentSuccess: true,
        });
        if (updData) {
          setUpdateData({
            status: updData.status,
            message: updData.message,
            changelog: updData.changelog,
            update_id: updData.update_id,
            version: updData.version,
          });
        }
      } else {
        setUpdateData({
          status: false,
          message: "You have the latest version of Bicrypto.",
          changelog: null,
          update_id: "",
          version: bcData?.version || "",
        });
      }
    } catch (err) {
      console.error("Error fetching blockchain data:", err);
      setUpdateData({
        status: false,
        message: "Unable to check for updates at this time.",
        changelog: null,
        update_id: "",
        version: "",
      });
    }
  };
  const checkForUpdates = async () => {
    if (!productId || !blockchainVersion) return;
    setIsUpdateChecking(true);
    try {
      const { data } = await $fetch({
        url: `/api/admin/system/update/check`,
        method: "POST",
        body: { productId, currentVersion: blockchainVersion },
        silent: true,
      });
      if (data) {
        setUpdateData({
          status: data.status,
          message: data.message,
          changelog: data.changelog,
          update_id: data.update_id,
          version: data.version,
        });
      }
    } catch (err) {
      console.error("Check updates error:", err);
    }
    setIsUpdateChecking(false);
  };
  const updateBlockchain = async () => {
    if (!updateData.update_id) return;
    setIsUpdating(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/system/update/download`,
        method: "POST",
        body: {
          productId,
          updateId: updateData.update_id,
          version: updateData.version,
          product: blockchainName,
          type: "blockchain",
        },
        silentSuccess: true,
      });
      if (!error) {
        setBlockchainVersion(updateData.version);
        fetchBlockchainData();
      }
    } catch (err) {
      console.error("Update error:", err);
    }
    setIsUpdating(false);
  };
  const activateLicenseAction = async () => {
    setIsSubmitting(true);
    try {
      const { data } = await $fetch({
        url: `/api/admin/system/license/activate`,
        method: "POST",
        body: { productId, purchaseCode, envatoUsername },
        silentSuccess: true,
      });
      if (data) {
        setLicenseVerified(data.status);
        if (data.status) {
          fetchBlockchainData();
        }
      }
    } catch (err) {
      console.error("License activation error:", err);
    }
    setIsSubmitting(false);
  };
  const handleActivateBlockchain = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/ecosystem/blockchain/${productId}/status`,
        method: "PUT",
        body: { status: !blockchainStatus },
        silentSuccess: true,
      });
      if (!error) {
        setBlockchainStatus(!blockchainStatus);
      }
    } catch (err) {
      console.error("Error toggling blockchain status:", err);
    }
    setIsSubmitting(false);
  };
  const setPassphraseHandler = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await $fetch({
        url: "/api/admin/ecosystem/kms",
        method: "POST",
        body: { passphrase },
        silentSuccess: true,
      });
      if (!error) {
        setIsPassPhraseDialogOpen(false);
        setPassphrase("");
      }
    } catch (err) {
      console.error("Passphrase error:", err);
    }
    setIsSubmitting(false);
  };
  const noUpdateAvailable =
    !updateData.status &&
    updateData.message === "You have the latest version of Bicrypto.";
  const errorOrFallbackScenario =
    !updateData.status &&
    updateData.message !== "You have the latest version of Bicrypto." &&
    updateData.message !== "";
  return (
    <div className="container py-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold">
            {blockchainChain || "Blockchain Details"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("current_version")}{" "}
            <span className="font-medium text-info-500">
              {blockchainVersion}
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div
            className={`w-4 h-4 rounded-full animate-pulse ${
              licenseVerified ? "bg-green-500" : "bg-red-500"
            }`}
            title={
              licenseVerified ? "License Verified" : "License Not Verified"
            }
          />
          <span className="text-sm">
            {licenseVerified ? "License Verified" : "License Not Verified"}
          </span>
          {blockchainVersion !== "0.0.1" && (
            <Button
              color={blockchainStatus ? "destructive" : "success"}
              onClick={handleActivateBlockchain}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              <Icon
                icon={blockchainStatus ? "carbon:close" : "carbon:checkmark"}
                className="mr-2 h-5 w-5"
              />
              {blockchainStatus ? "Disable" : "Enable"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/admin/ecosystem")}
          >
            <Icon icon="material-symbols:arrow-back" className="mr-2 h-5 w-5" />
            {t("Back")}
          </Button>
        </div>
      </div>
      {/* Main Content: 3-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left (2/3) */}
        <div className="col-span-2 space-y-6">
          {isUpdateChecking ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton style={{ height: 48 }} className={skeletonClass} />
              </div>
              <Card className="p-5 space-y-5 border">
                <div className="space-y-4">
                  <Skeleton
                    style={{ height: 20, width: 120 }}
                    className={skeletonClass}
                  />
                  <Skeleton
                    style={{ height: 20, width: "100%" }}
                    className={skeletonClass}
                  />
                  <Skeleton
                    style={{ height: 20, width: "100%" }}
                    className={skeletonClass}
                  />
                  <Skeleton
                    style={{ height: 20, width: "100%" }}
                    className={skeletonClass}
                  />
                </div>
              </Card>
            </div>
          ) : (
            <>
              {updateData.status && (
                <div className="space-y-3">
                  <Card className="p-4 border bg-accent/10">
                    <p className="text-sm">
                      {t("please_backup_your_before_upgrading")}.
                    </p>
                  </Card>
                  {updateData.message && (
                    <Card className="p-4 border bg-success/10">
                      <p className="text-sm">{updateData.message}</p>
                    </Card>
                  )}
                </div>
              )}
              {noUpdateAvailable && (
                <>
                  <Card className="p-4 border bg-success/10">
                    <p className="text-sm">{updateData.message}</p>
                  </Card>
                  <Card className="p-5 space-y-5 border flex flex-col">
                    <h3 className="text-xl font-semibold">
                      {t("update_notes")}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {t("there_are_no_this_time")}.
                    </p>
                  </Card>
                </>
              )}
              {errorOrFallbackScenario && (
                <Card className="p-4 border bg-warning/10">
                  <p className="text-sm">
                    {updateData.message ||
                      "Unable to retrieve update information."}
                  </p>
                </Card>
              )}
              {updateData.status && updateData.changelog && (
                <Card className="p-5 space-y-5 border">
                  <h3 className="text-xl font-semibold">{t("update_notes")}</h3>
                  <div className="max-h-96 overflow-auto">
                    {isMarkdownContent(updateData.changelog) ? (
                      <MarkdownRenderer 
                        content={updateData.changelog} 
                        className="text-sm"
                      />
                    ) : (
                      <div
                        className="pl-5 text-sm"
                        dangerouslySetInnerHTML={{ __html: updateData.changelog }}
                      />
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
        {/* Right (1/3) */}
        <div className="col-span-1 space-y-6">
          <Card className="p-5 space-y-4 border">
            <h3 className="text-lg font-semibold">{t("update_actions")}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {updateData.status
                ? "Update to the latest version once your license is verified."
                : "No updates available or unable to retrieve updates."}
            </p>
            <div className="flex flex-col gap-3">
              <Button
                color="success"
                className="w-full"
                onClick={updateBlockchain}
                disabled={
                  !updateData.status ||
                  !licenseVerified ||
                  updateData.update_id === "" ||
                  isUpdating
                }
                loading={isUpdating}
              >
                {blockchainVersion === "0.0.1" ? "Install" : "Update"}
              </Button>
              <Button
                color="primary"
                className="w-full"
                onClick={checkForUpdates}
                disabled={isUpdateChecking}
                loading={isUpdateChecking}
              >
                {t("check_for_updates")}
              </Button>
            </div>
          </Card>
          {!licenseVerified && (
            <Card className="p-5 space-y-4 border">
              <h4 className="text-md font-semibold">
                {t("license_verification")}
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("please_enter_your_your_license")}.
              </p>
              <div className="space-y-2">
                <Input
                  value={purchaseCode}
                  onChange={(e) => setPurchaseCode(e.target.value)}
                  placeholder="Enter your purchase code"
                />
                <Input
                  value={envatoUsername}
                  onChange={(e) => setEnvatoUsername(e.target.value)}
                  placeholder="Enter your Envato username"
                />
              </div>
              <Button
                color="primary"
                className="w-full"
                onClick={activateLicenseAction}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {t("activate_license")}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
