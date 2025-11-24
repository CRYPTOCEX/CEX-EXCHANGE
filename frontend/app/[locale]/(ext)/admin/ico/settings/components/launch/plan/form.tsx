"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { $fetch } from "@/lib/api";
import { useDirtyForm } from "@/context/dirty-form-context";
import { useTranslations } from "next-intl";

export interface LaunchPlanFormValues {
  name: string;
  description: string;
  price: string;
  walletType: string;
  currency: string;
  recommended: boolean;
  status: boolean;
  features: {
    maxTeamMembers: string;
    maxRoadmapItems: string;
    maxOfferingPhases: string;
    maxUpdatePosts: string; // Added posts support
    supportLevel: "basic" | "standard" | "premium";
    marketingSupport: boolean;
    auditIncluded: boolean;
    customTokenomics: boolean;
    priorityListing: boolean;
    kycRequired: boolean;
  };
}

interface LaunchPlanFormProps {
  initialValues: LaunchPlanFormValues;
  onSubmit: (values: LaunchPlanFormValues) => void;
  onCancel: () => void;
  /** Indicates if this form is currently active (its tab is visible) */
  isActive?: boolean;
}

export default function LaunchPlanForm({
  initialValues,
  onSubmit,
  onCancel,
  isActive = true,
}: LaunchPlanFormProps) {
  const t = useTranslations("ext");
  // Keep a stable copy of the clean values.
  const [cleanValues] = useState<LaunchPlanFormValues>(initialValues);
  const [formValues, setFormValues] =
    useState<LaunchPlanFormValues>(initialValues);
  const { setDirty } = useDirtyForm();
  const [activeTab, setActiveTab] = useState<string>("basic");

  // Local state to control the confirmation dialog when Cancel is clicked.
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch wallet and currency options.
  const [walletTypeOptions, setWalletTypeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [currencyOptions, setCurrencyOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    async function fetchWalletTypes() {
      const { data, error } = await $fetch<{ id: string; name: string }[]>({
        url: "/api/admin/finance/wallet/options",
        silent: true,
      });
      if (!error && data) {
        setWalletTypeOptions(
          data.map((item) => ({ value: item.id, label: item.name }))
        );
      }
    }
    fetchWalletTypes();
  }, []);

  useEffect(() => {
    if (!formValues.walletType) {
      setCurrencyOptions([]);
      return;
    }
    async function fetchCurrencies() {
      const { data, error } = await $fetch<{ id: string; name: string }[]>({
        url: "/api/admin/finance/currency/options",
        params: { type: formValues.walletType },
        silent: true,
      });
      if (!error && data) {
        setCurrencyOptions(
          data.map((item) => ({ value: item.id, label: item.name }))
        );
      }
    }
    fetchCurrencies();
  }, [formValues.walletType]);

  // Update dirty flag whenever formValues changes.
  useEffect(() => {
    setDirty(JSON.stringify(formValues) !== JSON.stringify(cleanValues));
  }, [formValues, cleanValues, setDirty]);

  // When the form is not active (its tab is hidden), reset the form.
  useEffect(() => {
    if (!isActive) {
      setFormValues(cleanValues);
      setDirty(false);
    }
  }, [isActive, cleanValues, setDirty]);

  const handleChange = (field: keyof LaunchPlanFormValues, value: any) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeatureChange = (
    field: keyof LaunchPlanFormValues["features"],
    value: any
  ) => {
    setFormValues((prev) => ({
      ...prev,
      features: { ...prev.features, [field]: value },
    }));
  };

  // Sub-tabs within the form do not trigger any confirmation.
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  // When Cancel is clicked, if there are unsaved changes, show the custom dialog.
  const handleCancel = () => {
    if (JSON.stringify(formValues) !== JSON.stringify(cleanValues)) {
      setShowConfirm(true);
    } else {
      onCancel();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formValues);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {cleanValues.name ? "Edit Launch Plan" : "Add Launch Plan"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic">{t("basic_info")}</TabsTrigger>
              <TabsTrigger value="features">
                {t("features_&_limits")}
              </TabsTrigger>
              <TabsTrigger value="advanced">{t("Advanced")}</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4">
              <Input
                id="name"
                label="Plan Name"
                value={formValues.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Basic, Standard, Premium"
                required
              />
              <Textarea
                id="description"
                label="Description"
                value={formValues.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Brief description of the plan"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  label="Price"
                  value={formValues.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  required
                />
                <Select
                  value={formValues.walletType}
                  onValueChange={(value) => handleChange("walletType", value)}
                  required
                >
                  <SelectTrigger id="walletType" title="Wallet Type">
                    <SelectValue placeholder="Select wallet type" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select
                value={formValues.currency}
                onValueChange={(value) => handleChange("currency", value)}
                required
                disabled={!formValues.walletType}
              >
                <SelectTrigger id="currency" title="Currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Switch
                  id="recommended"
                  checked={formValues.recommended}
                  onCheckedChange={(value) =>
                    handleChange("recommended", value)
                  }
                />
                <Label htmlFor="recommended">{t("recommended_plan")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formValues.status}
                  onCheckedChange={(value) => handleChange("status", value)}
                />
                <Label htmlFor="status">{t("Status")}</Label>
              </div>
            </TabsContent>
            <TabsContent value="features" className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Input
                  id="maxTeamMembers"
                  type="number"
                  min="1"
                  label="Max Team Members"
                  value={formValues.features.maxTeamMembers}
                  onChange={(e) =>
                    handleFeatureChange("maxTeamMembers", e.target.value)
                  }
                  required
                />
                <Input
                  id="maxRoadmapItems"
                  type="number"
                  min="1"
                  label="Max Roadmap Items"
                  value={formValues.features.maxRoadmapItems}
                  onChange={(e) =>
                    handleFeatureChange("maxRoadmapItems", e.target.value)
                  }
                  required
                />
                <Input
                  id="maxOfferingPhases"
                  type="number"
                  min="1"
                  label="Max Offering Phases"
                  value={formValues.features.maxOfferingPhases}
                  onChange={(e) =>
                    handleFeatureChange("maxOfferingPhases", e.target.value)
                  }
                  required
                />
                <Input
                  id="maxUpdatePosts"
                  type="number"
                  min="1"
                  label="Max Update Posts"
                  value={formValues.features.maxUpdatePosts}
                  onChange={(e) =>
                    handleFeatureChange("maxUpdatePosts", e.target.value)
                  }
                  required
                />
              </div>
              <Select
                value={formValues.features.supportLevel}
                onValueChange={(value) =>
                  handleFeatureChange("supportLevel", value)
                }
                required
              >
                <SelectTrigger id="supportLevel" title="Support Level">
                  <SelectValue placeholder="Select support level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    {t("basic_(email_only)")}
                  </SelectItem>
                  <SelectItem value="standard">
                    {t("standard_(email_+_chat)")}
                  </SelectItem>
                  <SelectItem value="premium">
                    {t("premium_(email_+_chat_+_dedicated_manager)")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="marketingSupport"
                    checked={formValues.features.marketingSupport}
                    onCheckedChange={(value) =>
                      handleFeatureChange("marketingSupport", value)
                    }
                  />
                  <Label htmlFor="marketingSupport">
                    {t("marketing_support")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auditIncluded"
                    checked={formValues.features.auditIncluded}
                    onCheckedChange={(value) =>
                      handleFeatureChange("auditIncluded", value)
                    }
                  />
                  <Label htmlFor="auditIncluded">
                    {t("security_audit_included")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="customTokenomics"
                    checked={formValues.features.customTokenomics}
                    onCheckedChange={(value) =>
                      handleFeatureChange("customTokenomics", value)
                    }
                  />
                  <Label htmlFor="customTokenomics">
                    {t("custom_tokenomics")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="priorityListing"
                    checked={formValues.features.priorityListing}
                    onCheckedChange={(value) =>
                      handleFeatureChange("priorityListing", value)
                    }
                  />
                  <Label htmlFor="priorityListing">
                    {t("priority_listing")}
                  </Label>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="advanced" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="kycRequired"
                  checked={formValues.features.kycRequired}
                  onCheckedChange={(value) =>
                    handleFeatureChange("kycRequired", value)
                  }
                />
                <Label htmlFor="kycRequired">{t("kyc_required")}</Label>
              </div>
              <div className="text-sm text-muted-foreground mt-4">
                <p>{t("additional_advanced_settings_configured_here")}.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t("Cancel")}
          </Button>
          <Button type="submit">{t("save_changes")}</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
