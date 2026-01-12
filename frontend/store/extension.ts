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
  licenseVerified?: boolean;
  category?: "extension" | "blockchain" | "exchange";
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
    envatoUsername: string,
    notificationEmail?: string
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
        // Combine all product types: extensions, blockchains, and exchangeProviders
        let allProducts: Extension[] = [];

        // Handle old format (array) - legacy support
        if (Array.isArray(data)) {
          allProducts = data;
        } else {
          // New format with separate categories
          if (data.extensions && Array.isArray(data.extensions)) {
            allProducts.push(...data.extensions);
          }
          if (data.blockchains && Array.isArray(data.blockchains)) {
            allProducts.push(...data.blockchains);
          }
          if (data.exchangeProviders && Array.isArray(data.exchangeProviders)) {
            allProducts.push(...data.exchangeProviders);
          }
        }

        // Sort products alphabetically by title
        const sortedData = allProducts.sort((a, b) =>
          a.title.localeCompare(b.title)
        );
        set({ extensions: sortedData, filteredExtensions: sortedData });
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
      // Determine the type based on the product category
      const productType = currentExtension.category || "extension";

      const { data, error } = await $fetch({
        url: "/api/admin/system/update/download",
        method: "POST",
        body: {
          productId: currentExtension.productId,
          updateId: updateData.update_id,
          version: updateData.version,
          product: currentExtension.title,
          type: productType,
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

  activateLicense: async (purchaseCode: string, envatoUsername: string, notificationEmail?: string) => {
    const { currentExtension } = get();
    if (!currentExtension) return;

    set({ error: null });
    try {
      const body: Record<string, string> = {
        productId: currentExtension.productId,
        purchaseCode,
        envatoUsername,
      };
      if (notificationEmail) {
        body.notificationEmail = notificationEmail;
      }
      const { data, error } = await $fetch({
        url: "/api/admin/system/license/activate",
        method: "POST",
        body,
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
    const filtered = extensions
      .filter(
        (extension) =>
          extension.title.toLowerCase().includes(lowercasedFilter) ||
          extension.description.toLowerCase().includes(lowercasedFilter)
      )
      .sort((a, b) => a.title.localeCompare(b.title));
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
      // Determine the correct API URL based on product category
      let url = "";
      const category = extension.category || "extension";

      switch (category) {
        case "blockchain":
          url = `/api/admin/ecosystem/blockchain/${extension.productId}/status`;
          break;
        case "exchange":
          url = `/api/admin/finance/exchange/provider/${extension.id}/status`;
          break;
        case "extension":
        default:
          url = `/api/admin/system/extension/${extension.productId}/status`;
          break;
      }

      // Call the API to update the extension status
      const { data, error } = await $fetch({
        url,
        method: "PUT",
        body: { status: newStatus },
      });
      if (error) throw new Error(error);

      // On success, update the store state
      // For exchanges, enabling one should disable others
      set((state) => ({
        extensions: state.extensions.map((ext) => {
          if (ext.id === id) {
            return { ...ext, status: newStatus };
          }
          // If enabling an exchange, disable all other exchanges
          if (category === "exchange" && newStatus && ext.category === "exchange") {
            return { ...ext, status: false };
          }
          return ext;
        }),
        filteredExtensions: state.filteredExtensions.map((ext) => {
          if (ext.id === id) {
            return { ...ext, status: newStatus };
          }
          // If enabling an exchange, disable all other exchanges
          if (category === "exchange" && newStatus && ext.category === "exchange") {
            return { ...ext, status: false };
          }
          return ext;
        }),
        // Also update currentExtension if it's the one being toggled
        currentExtension: state.currentExtension?.id === id
          ? { ...state.currentExtension, status: newStatus }
          : state.currentExtension,
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
