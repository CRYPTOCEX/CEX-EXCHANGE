import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "./config"; // Import config store to refresh settings

interface Extension {
  id: string;
  productId: string;
  name: string;
  title: string;
  description: string;
  link: string;
  status: boolean;
  version: string;
  image: string;
  hasLicenseUpdate?: boolean;
  licenseVersion?: string;
  licenseReleaseDate?: string;
  licenseSummary?: string;
}

interface UpdateData {
  status: boolean;
  message: string;
  changelog: string | null;
  update_id: string;
  version: string;
}

interface ExtensionStore {
  extensions: Extension[];
  filteredExtensions: Extension[];
  currentExtension: Extension | null;
  isLoading: boolean;
  error: string | null;
  licenseVerified: boolean;
  updateData: UpdateData;
  isUpdating: boolean;
  isUpdateChecking: boolean;
  filter: string;
  fetchExtensions: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  updateExtension: () => Promise<void>;
  activateLicense: (
    purchaseCode: string,
    envatoUsername: string
  ) => Promise<void>;
  verifyLicense: (productId: string) => Promise<void>;
  setFilter: (filter: string) => void;
  toggleExtension: (id: string) => void;
  setCurrentExtension: (extension: Extension) => void;
}

export const useExtensionStore = create<ExtensionStore>((set, get) => ({
  extensions: [],
  filteredExtensions: [],
  currentExtension: null,
  isLoading: false,
  error: null,
  licenseVerified: false,
  updateData: {
    status: false,
    message: "",
    changelog: null,
    update_id: "",
    version: "",
  },
  isUpdating: false,
  isUpdateChecking: false,
  filter: "",

  setCurrentExtension: (extension: Extension) => {
    set({ currentExtension: extension });
    // Automatically verify license when extension is selected
    get().verifyLicense(extension.productId);
  },

  fetchExtensions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/extension",
        silent: true,
      });
      if (error) throw new Error(error);
      if (data) {
        set({ extensions: data, filteredExtensions: data });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to fetch extensions:", errorMessage);
      set({ error: errorMessage || "Failed to fetch extensions" });
    } finally {
      set({ isLoading: false });
    }
  },

  checkForUpdates: async () => {
    const { currentExtension } = get();
    if (!currentExtension) return;

    set({ isUpdateChecking: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/update/check",
        method: "POST",
        body: {
          productId: currentExtension.productId,
          currentVersion: currentExtension.version,
        },
        silent: true,
      });
      if (error) throw new Error(error);
      if (data) {
        set({ updateData: data });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to check for updates:", errorMessage);
      set({ error: errorMessage || "Failed to check for updates" });
    } finally {
      set({ isUpdateChecking: false });
    }
  },

  updateExtension: async () => {
    const { currentExtension, updateData } = get();
    if (!currentExtension) return;

    set({ isUpdating: true, error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/update/download",
        method: "POST",
        body: {
          productId: currentExtension.productId,
          updateId: updateData.update_id,
          version: updateData.version,
          product: currentExtension.title,
          type: "extension",
        },
      });
      if (error) throw new Error(error);
      
      if (data) {
        set((state) => ({
          currentExtension: {
            ...state.currentExtension!,
            version: updateData.version,
          },
          updateData: {
            ...state.updateData,
            message: "Update completed successfully.",
          },
        }));
        
        await get().fetchExtensions();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to update extension:", errorMessage);
      set({ error: errorMessage || "Failed to update extension" });
    } finally {
      set({ isUpdating: false });
    }
  },

  activateLicense: async (purchaseCode: string, envatoUsername: string) => {
    const { currentExtension } = get();
    if (!currentExtension) return;

    set({ error: null });
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/license/activate",
        method: "POST",
        body: {
          productId: currentExtension.productId,
          purchaseCode,
          envatoUsername,
        },
      });
      if (error) throw new Error(error);
      if (data) {
        set({ licenseVerified: data.status });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to activate license:", errorMessage);
      set({ error: errorMessage || "Failed to activate license" });
    }
  },

  verifyLicense: async (productId: string) => {
    if (!productId) return;

    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/license/verify",
        method: "POST",
        body: { productId },
        silent: true,
      });

      if (!error && data) {
        set({ licenseVerified: data.status });
        // Remove automatic checkForUpdates call to prevent infinite loop
        // The page component will handle this via useEffect
      } else {
        set({ licenseVerified: false });
      }
    } catch (error) {
      console.error("Failed to verify license:", error);
      set({ licenseVerified: false });
    }
  },

  setFilter: (filter: string) => {
    const { extensions } = get();
    const lowercasedFilter = filter.toLowerCase();
    const filtered = extensions.filter(
      (extension) =>
        extension.title.toLowerCase().includes(lowercasedFilter) ||
        extension.description.toLowerCase().includes(lowercasedFilter)
    );
    set({ filter, filteredExtensions: filtered });
  },

  toggleExtension: async (id: string) => {
    // Find the extension by id
    const state = get();
    const extension = state.extensions.find((ext) => ext.id === id);
    if (!extension) return;

    // Calculate the new status
    const newStatus = !extension.status;

    try {
      // Call the API to update the extension status
      const { data, error } = await $fetch({
        url: `/api/admin/system/extension/${extension.productId}/status`,
        method: "PUT",
        body: { status: newStatus },
      });
      if (error) throw new Error(error);

      // On success, update the store state
      set((state) => ({
        extensions: state.extensions.map((ext) =>
          ext.id === id ? { ...ext, status: newStatus } : ext
        ),
        filteredExtensions: state.filteredExtensions.map((ext) =>
          ext.id === id ? { ...ext, status: newStatus } : ext
        ),
      }));

      // Refresh the global settings/extensions cache to update menu
      // This will trigger a refresh of the settings which includes extensions
      try {
        const { data: settingsData, error: settingsError } = await $fetch({
          url: "/api/settings",
          silent: true,
        });

        if (!settingsError && settingsData) {
          // Get the config store and update settings
          const configStore = useConfigStore.getState();
          
          if (settingsData.settings) {
            const settingsObj = settingsData.settings.reduce(
              (acc: Record<string, any>, cur: { key: string; value: any }) => {
                acc[cur.key] = cur.value;
                return acc;
              },
              {}
            );
            configStore.setSettings(settingsObj);
          }
          
          if (settingsData.extensions) {
            configStore.setExtensions(settingsData.extensions);
          }

          // Mark settings as fetched and clear any errors
          configStore.setSettingsFetched(true);
          configStore.setSettingsError(null);
        }
      } catch (settingsError) {
        console.warn("Failed to refresh settings cache:", settingsError);
        // Don't fail the extension toggle if settings refresh fails
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to toggle extension status:", errorMessage);
      set({ error: errorMessage || "Failed to toggle extension status" });
    }
  },
}));
