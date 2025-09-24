"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GeneralSettingsSection from "./components/general";
import DisplaySettingsSection from "./components/display";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

export default function SettingsConfiguration() {
  const t = useTranslations("ext");
  const { settings, setSettings, updateSetting } = useConfigStore();
  const [localSettings, setLocalSettings] = useState({
    ecommerceDefaultTaxRate: 10,
    ecommerceDefaultShippingCost: 10,
    ecommerceProductsPerPage: 12,
    ecommerceShowProductRatings: true,
    ecommerceShowRelatedProducts: true,
    ecommerceShowFeaturedProducts: true,
    ecommerceShippingEnabled: true,
    ecommerceTaxEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        ecommerceDefaultTaxRate: settings.ecommerceDefaultTaxRate || 10,
        ecommerceDefaultShippingCost:
          settings.ecommerceDefaultShippingCost || 10,
        ecommerceProductsPerPage: settings.ecommerceProductsPerPage || 12,
        ecommerceShowProductRatings:
          settings.ecommerceShowProductRatings ?? true,
        ecommerceShowRelatedProducts:
          settings.ecommerceShowRelatedProducts ?? true,
        ecommerceShowFeaturedProducts:
          settings.ecommerceShowFeaturedProducts ?? true,
        ecommerceShippingEnabled: settings.ecommerceShippingEnabled ?? true,
        ecommerceTaxEnabled: settings.ecommerceTaxEnabled ?? true,
      });
    }
    setLoading(false);
  }, [settings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    const { error } = await $fetch({
      url: "/api/admin/system/settings",
      method: "PUT",
      body: localSettings,
    });
    if (!error) {
      // Merge with existing settings to avoid overwriting other extensions' settings
      const mergedSettings = { ...settings, ...localSettings };
      setSettings(mergedSettings);
      setLocalSettings(mergedSettings);
    }
    setSaving(false);
  };

  const handleUpdateSetting = <T extends keyof any>(key: T, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key as string]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("e-commerce_settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("configure_your_e-commerce_store_settings")}
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {t("save_changes")}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="general">{t("General")}</TabsTrigger>
          <TabsTrigger value="display">{t("Display")}</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettingsSection
            settings={localSettings}
            onUpdate={handleUpdateSetting}
          />
        </TabsContent>
        <TabsContent value="display">
          <DisplaySettingsSection
            settings={localSettings}
            onUpdate={handleUpdateSetting}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
