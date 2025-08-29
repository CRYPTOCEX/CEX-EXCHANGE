"use client";
import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { TABS, FIELD_DEFINITIONS } from "@/config/settings";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { SettingsTab } from "./components/tab";
import { useTranslations } from "next-intl";
import { useSettings } from "@/hooks/use-settings";
import { imageUploader } from "@/utils/upload";

export default function SettingsPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings: configSettings, setSettings, setIsLoading } = useConfigStore();
  const {
    isLoading,
    settingsFetched,
    settingsError,
    retryFetch,
    fetchSettings,
  } = useSettings();
  
  // Get tab from URL query parameter, fallback to first tab
  const tabFromUrl = searchParams.get('tab');
  const validTab = TABS.find(tab => tab.id === tabFromUrl)?.id || TABS[0].id;
  const [activeTab, setActiveTab] = useState(validTab);
  const [hasChanges, setHasChanges] = useState(false);
  // Local "draft" copy of settings for editing
  // Initialize with empty object, will be populated via useEffect
  const [draftSettings, setDraftSettings] = useState<Record<string, any>>({});
  
  // Get all valid field keys from the configuration
  const validFieldKeys = new Set(FIELD_DEFINITIONS.map(field => field.key));
  
  // Update active tab when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTab = TABS.find(tab => tab.id === tabFromUrl)?.id || TABS[0].id;
    setActiveTab(validTab);
  }, [searchParams]);
  
  // Initialize draftSettings when config settings are available or changed
  useEffect(() => {
    if (settingsFetched) {
      // Always update draft settings when config settings change
      // This ensures the form reflects the latest saved values
      // Even if configSettings is empty, we should set it
      setDraftSettings({ ...configSettings });
    }
  }, [settingsFetched, configSettings]);
  

  
  // Check for unsaved changes by comparing draftSettings and configSettings.
  useEffect(() => {
    setHasChanges(
      JSON.stringify(draftSettings) !== JSON.stringify(configSettings)
    );
  }, [draftSettings, configSettings]);
  
  // Update the local draft when a field changes.
  const handleChange = (key: string, value: string | File | null) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };
  
  // When saving, update the API and then refetch the actual settings from server.
  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Handle file uploads first
      const fileUploadPromises: Promise<{ key: string; url: string }>[] = [];
      
      Object.entries(draftSettings).forEach(([key, value]) => {
        if (validFieldKeys.has(key) && value instanceof File) {
          // Find the field definition to get file size requirements
          const fieldDef = FIELD_DEFINITIONS.find(f => f.key === key);
          const size = fieldDef?.fileSize || { maxWidth: 1024, maxHeight: 1024 };
          
          // Create upload promise
          const uploadPromise = imageUploader({
            file: value,
            dir: "settings",
            size: {
              width: 'width' in size ? size.width : undefined,
              height: 'height' in size ? size.height : undefined,
              maxWidth: 'width' in size ? size.width : size.maxWidth,
              maxHeight: 'height' in size ? size.height : size.maxHeight
            },
            oldPath: typeof configSettings[key] === 'string' ? configSettings[key] : ""
          }).then(result => {
            if (result.success && result.url) {
              return { key, url: result.url };
            } else {
              throw new Error(`Failed to upload ${key}: ${result.error}`);
            }
          });
          
          fileUploadPromises.push(uploadPromise);
        }
      });
      
      // Wait for all file uploads to complete
      const uploadResults = await Promise.all(fileUploadPromises);
      
      // Step 2: Create a clean payload with uploaded file URLs and other settings
      const cleanPayload: Record<string, any> = {};
      
      // First, add all uploaded file URLs
      uploadResults.forEach(({ key, url }) => {
        cleanPayload[key] = url;
      });
      
      // Then, add all non-file settings
      Object.entries(draftSettings).forEach(([key, value]) => {
        if (validFieldKeys.has(key) && !(value instanceof File)) {
          // Ensure we don't send invalid serialized data
          if (value !== null && value !== undefined) {
            // Convert to string and avoid circular references
            let cleanValue = value;
            if (typeof value === 'object' && value !== null) {
              try {
                cleanValue = JSON.stringify(value);
              } catch (e) {
                console.warn(`Skipping invalid setting ${key}:`, e);
                return;
              }
            }
            
            cleanPayload[key] = String(cleanValue);
          }
        }
      });

      // Step 3: Save the clean settings payload
      const { error } = await $fetch({
        url: "/api/admin/system/settings",
        method: "PUT",
        body: cleanPayload,
      });
      
      if (!error) {
        // Update the config store directly with the saved values to avoid timing issues
        setSettings(cleanPayload);
        // Also refetch from server to ensure consistency
        await fetchSettings();
        setHasChanges(false);
      } else {
        throw new Error(error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // You can add toast notification here if needed
    } finally {
      setIsLoading(false);
    }
  };
  
  // On cancel, revert the draft back to the saved config settings.
  const handleCancel = () => {
    setDraftSettings({ ...configSettings });
    setHasChanges(false);
  };
  
  // Add retry function
  const handleRetry = () => {
    retryFetch();
  };

  // Show loading state while settings are being fetched
  if (!settingsFetched) {
    return (
      <div className="flex items-center justify-center h-screen">
        {t("loading_settings")}...
      </div>
    );
  }

  // Show error state with retry option
  if (settingsError && !settingsFetched) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            {t("failed_to_load_settings")}
          </h2>
          <p className="text-muted-foreground mt-2">{settingsError}</p>
        </div>
        <Button onClick={handleRetry} variant="outline">
          {t("Retry")}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="mx-auto">
      <div className="flex justify-between items-center pb-4">
        <h1 className="text-3xl font-bold py-1">{t("system_settings")}</h1>
        {hasChanges && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              {t("Cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {t("save_changes")}
            </Button>
          </div>
        )}
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          // Update URL with new tab parameter
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.set('tab', value);
          router.replace(`?${newSearchParams.toString()}`);
        }}
        className="w-full"
      >
        <TabsList className="w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="w-full">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6 mt-5">
            {/* Pass the local draftSettings and handleChange function to the SettingsTab */}
            <SettingsTab
              tabId={tab.id}
              tabLabel={tab.label}
              fields={FIELD_DEFINITIONS.filter(
                (field) => field.category === tab.id
              )}
              draftSettings={draftSettings}
              onFieldChange={handleChange}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
