"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, Trash2, Sparkles, Layers, Percent, Clock } from "lucide-react";
import { PoolFormBasicInfo } from "./pool-form-basic-info";
import { PoolFormStakingDetails } from "./pool-form-staking-details";
import { PoolFormDescription } from "./pool-form-description";
import { PoolFormProfitSettings } from "./pool-form-profit-settings";
import { PoolFormPreview } from "./pool-form-preview";
import type { PoolFormValues } from "./pool-form";
import { Link, useRouter } from "@/i18n/routing";
import { imageUploader } from "@/utils/upload";
import { useStakingAdminPoolsStore } from "@/store/staking/admin/pool";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { motion } from "framer-motion";

export default function StakingPoolFormPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { id } = useParams() as { id?: string };
  const poolId = id;
  const pools = useStakingAdminPoolsStore((state) => state.pools);
  const selectedPool = useStakingAdminPoolsStore((state) => state.selectedPool);
  const isLoading = useStakingAdminPoolsStore((state) => state.isLoading);
  const error = useStakingAdminPoolsStore((state) => state.error);
  const fetchPools = useStakingAdminPoolsStore((state) => state.fetchPools);
  const getPoolById = useStakingAdminPoolsStore((state) => state.getPoolById);
  const createPool = useStakingAdminPoolsStore((state) => state.createPool);
  const updatePool = useStakingAdminPoolsStore((state) => state.updatePool);
  const deletePool = useStakingAdminPoolsStore((state) => state.deletePool);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState("basic-info");
  const [formData, setFormData] = useState<PoolFormValues>({
    name: "",
    token: "",
    symbol: "",
    icon: undefined, // Changed from null to undefined
    apr: 5,
    minStake: 0.01,
    maxStake: null,
    lockPeriod: 30,
    availableToStake: 1000,
    totalStaked: 0, // Added missing required field
    status: "ACTIVE",
    description: "",
    risks: "",
    rewards: "",
    isPromoted: false,
    order: pools.length + 1,
    // New fields for centralized staking
    externalPoolUrl: "",
    adminFeePercentage: 10,
    earningFrequency: "MONTHLY",
    earlyWithdrawalFee: 5,
    autoCompound: false,
    profitSource: "",
    fundAllocation: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isEditMode = !!poolId;

  useEffect(() => {
    const loadPoolData = async () => {
      if (isEditMode && poolId) {
        // If pools are not loaded, fetch them first
        if (pools.length === 0) {
          await fetchPools();
        }
        await getPoolById(poolId);
      }
    };
    loadPoolData();
  }, [isEditMode, poolId]); // Remove getPoolById and fetchPools from dependencies to avoid infinite loop

  useEffect(() => {
    if (isEditMode && selectedPool) {
      setFormData({
        name: selectedPool.name,
        token: selectedPool.token,
        symbol: selectedPool.symbol,
        icon: selectedPool.icon, // This is now string | undefined
        apr: selectedPool.apr,
        minStake: selectedPool.minStake,
        maxStake: selectedPool.maxStake,
        lockPeriod: selectedPool.lockPeriod,
        availableToStake: selectedPool.availableToStake,
        totalStaked: selectedPool.totalStaked ?? 0, // Added missing required field with fallback
        status: selectedPool.status,
        description: selectedPool.description,
        risks: selectedPool.risks,
        rewards: selectedPool.rewards,
        isPromoted: selectedPool.isPromoted,
        order: selectedPool.order,
        // New fields for centralized staking
        externalPoolUrl: selectedPool.externalPoolUrl || "",
        adminFeePercentage: selectedPool.adminFeePercentage || 10,
        earningFrequency: selectedPool.earningFrequency || "MONTHLY",
        earlyWithdrawalFee: selectedPool.earlyWithdrawalFee || 5,
        autoCompound: selectedPool.autoCompound || false,
        profitSource: selectedPool.profitSource || "",
        fundAllocation: selectedPool.fundAllocation || "",
      });
    }
  }, [isEditMode, selectedPool]);

  const handleUpdateFormData = (
    section: string,
    data: Partial<PoolFormValues>
  ) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setValidationErrors({});
    setHasSubmitted(true);

    try {
      // Prepare a mutable copy of formData for submission
      const poolData: any = {
        ...formData,
        // Ensure all string fields that might be undefined are converted to empty strings
        externalPoolUrl: formData.externalPoolUrl || "",
        profitSource: formData.profitSource || "",
        fundAllocation: formData.fundAllocation || "",
        description: formData.description || "",
        risks: formData.risks || "",
        rewards: formData.rewards || "",
      };

      // Check if the icon is a File and needs to be uploaded
      if (formData.icon instanceof File) {
        const uploadResult = await imageUploader({
          file: formData.icon,
          dir: "staking-pools",
          size: { maxWidth: 1024, maxHeight: 728 },
        });
        if (uploadResult.success) {
          poolData.icon = uploadResult.url;
        } else {
          throw new Error("Image upload failed");
        }
      } else {
        // Otherwise, ensure icon is a string (or undefined)
        poolData.icon = formData.icon || undefined;
      }

      let result;
      if (isEditMode && poolId) {
        result = await updatePool(poolId, poolData);
      } else {
        result = await createPool(poolData);
      }
      
      // Only navigate if the operation was successful
      if (result.success) {
        router.push(
          isEditMode ? `/admin/staking/pool/${poolId}` : "/admin/staking/pool"
        );
      } else if (result.validationErrors) {
        // Handle validation errors
        setValidationErrors(result.validationErrors);
        setSaveError("Please fix the validation errors below.");
      } else {
        // If the store has an error, use it; otherwise use a generic message
        setSaveError(error || "Failed to save staking pool. Please try again.");
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save staking pool"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !poolId) return;

    if (
      window.confirm(
        "Are you sure you want to delete this staking pool? This action cannot be undone."
      )
    ) {
      try {
        await deletePool(poolId);
        router.push("/admin/staking/pool");
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Failed to delete staking pool"
        );
      }
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  if (isEditMode && isLoading && !selectedPool) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">
              {t("loading_pool_details")}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEditMode && error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 mb-4">
              {"Error"}
              {error}
            </p>
            <Link href="/admin/staking/pool" className="inline-block">
              <Button>{t("return_to_staking_admin")}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while fetching pool data in edit mode
  if (isEditMode && isLoading && !selectedPool) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading_pool_data_ellipsis")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        breadcrumb={{
          icon: <ArrowLeft className="h-4 w-4" />,
          text: isEditMode ? t("back_to_pool_details") : tExt("back_to_pools"),
          href: isEditMode ? `/admin/staking/pool/${poolId}` : "/admin/staking/pool",
          className: "text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300",
        }}
        title={[
          { text: isEditMode ? tCommon("edit") + " " : tCommon("create") + " " },
          { text: t("staking_pool"), gradient: "bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 dark:from-violet-400 dark:via-indigo-400 dark:to-violet-400" },
        ]}
        description={isEditMode
          ? t("update_the_details_of_this_staking_pool")
          : t("configure_a_new_staking_pool_for_your_users")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <div className="flex gap-2">
            {isEditMode && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isSaving}
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("delete_pool")}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? tCommon("saving") + "..." : tCommon("save")}
            </Button>
          </div>
        }
        rightContentAlign="center"
        background={{
          orbs: [
            {
              color: "#8b5cf6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#6366f1",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#8b5cf6", "#6366f1"],
          size: 8,
        }}
      >
        <StatsGroup
          stats={[
            {
              icon: Percent,
              label: tCommon("apr"),
              value: `${formData.apr}%`,
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
            {
              icon: Clock,
              label: tCommon("lock_period"),
              value: `${formData.lockPeriod} ${tCommon("days")}`,
              iconColor: "text-indigo-500",
              iconBgColor: "bg-indigo-500/10",
            },
            {
              icon: Layers,
              label: tCommon("status"),
              value: formData.status,
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8 space-y-6">
        {(saveError || error) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p>{saveError || error}</p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("pool_configuration")}</CardTitle>
              <CardDescription>
                {t("configure_all_aspects_of_your_staking_pool")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="space-y-6"
              >
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="basic-info">
                    {tCommon("basic_info")}
                  </TabsTrigger>
                  <TabsTrigger value="staking-details">
                    {tExt("staking_details")}
                  </TabsTrigger>
                  <TabsTrigger value="profit-settings">
                    {t("profit_settings")}
                  </TabsTrigger>
                  <TabsTrigger value="description">
                    {tCommon("description")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic-info" className="space-y-6">
                  <PoolFormBasicInfo
                    formData={formData}
                    updateFormData={(data) =>
                      handleUpdateFormData("basic-info", data)
                    }
                    validationErrors={validationErrors}
                    hasSubmitted={hasSubmitted}
                  />
                </TabsContent>

                <TabsContent value="staking-details" className="space-y-6">
                  <PoolFormStakingDetails
                    formData={formData}
                    updateFormData={(data) =>
                      handleUpdateFormData("staking-details", data)
                    }
                    validationErrors={validationErrors}
                    hasSubmitted={hasSubmitted}
                  />
                </TabsContent>

                <TabsContent value="profit-settings" className="space-y-6">
                  <PoolFormProfitSettings
                    formData={formData}
                    updateFormData={(data) =>
                      handleUpdateFormData("profit-settings", data)
                    }
                    validationErrors={validationErrors}
                    hasSubmitted={hasSubmitted}
                  />
                </TabsContent>

                <TabsContent value="description" className="space-y-6">
                  <PoolFormDescription
                    formData={formData}
                    updateFormData={(data) =>
                      handleUpdateFormData("description", data)
                    }
                    validationErrors={validationErrors}
                    hasSubmitted={hasSubmitted}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-between mt-6 pt-6 border-t">
                {activeTab !== "basic-info" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const tabs = [
                        "basic-info",
                        "staking-details",
                        "profit-settings",
                        "description",
                      ];
                      const currentIndex = tabs.indexOf(activeTab);
                      setActiveTab(tabs[currentIndex - 1]);
                    }}
                  >
                    {tCommon('prev')}
                  </Button>
                )}
                {activeTab !== "description" ? (
                  <Button
                    className="ml-auto"
                    onClick={() => {
                      const tabs = [
                        "basic-info",
                        "staking-details",
                        "profit-settings",
                        "description",
                      ];
                      const currentIndex = tabs.indexOf(activeTab);
                      setActiveTab(tabs[currentIndex + 1]);
                    }}
                  >
                    {tCommon("next")}
                  </Button>
                ) : (
                  <Button
                    className="ml-auto"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Pool"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <PoolFormPreview formData={formData} />
        </div>
        </motion.div>
      </div>
    </div>
  );
}
