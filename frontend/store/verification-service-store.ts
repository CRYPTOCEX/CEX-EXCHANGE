import { $fetch } from "@/lib/api";
import { create } from "zustand";

interface VerificationServiceState {
  services: VerificationService[];
  selectedService: VerificationService | null;
  isLoading: boolean;
  error: string | null;

  // Functions
  fetchServices: () => Promise<VerificationService[]>;
  selectService: (serviceId: string) => void;
  checkEnv: (
    serviceId: string
  ) => Promise<{ success: boolean; missingEnvVars: string[] }>;
  checkConnection: (serviceId: string) => Promise<{ connected: boolean; message?: string }>;
  verifyApplication: (
    applicationId: string,
    serviceId: string
  ) => Promise<VerificationResult>;
  getVerificationResults: (
    applicationId: string
  ) => Promise<VerificationResult[]>;
}

export const useVerificationServiceStore = create<VerificationServiceState>(
  (set, get) => ({
    services: [],
    selectedService: null,
    isLoading: false,
    error: null,

    fetchServices: async () => {
      set({ isLoading: true, error: null });
      const { data, error } = await $fetch({
        url: "/api/admin/crm/kyc/service",
        silentSuccess: true,
      });
      if (error) {
        set({ error, isLoading: false });
        return [];
      }
      set({ services: data, isLoading: false });
      return data;
    },

    selectService: (serviceId: string) => {
      const { services } = get();
      const selectedService =
        services.find((service) => service.id === serviceId) || null;
      set({ selectedService });
    },

    checkEnv: async (serviceId: string) => {
      set({ isLoading: true, error: null });
      const { data, error } = await $fetch({
        url: `/api/admin/crm/kyc/service/${serviceId}/check-env`,
        silentSuccess: true,
      });
      set({ isLoading: false });
      if (!error) {
        return data;
      }

      return error;
    },

    checkConnection: async (serviceId: string) => {
      set({ isLoading: true, error: null });
      const { data, error } = await $fetch({
        url: `/api/admin/crm/kyc/service/${serviceId}/check-connection`,
        silentSuccess: true,
      });
      set({ isLoading: false });
      if (error) {
        set({ error });
        return { connected: false, message: error };
      }
      return {
        connected: data?.connected || false,
        message: data?.message || "",
      };
    },

    verifyApplication: async (applicationId: string, serviceId: string) => {
      set({ isLoading: true, error: null });
      const { data, error } = await $fetch({
        url: `/api/admin/crm/kyc/service/${serviceId}/verify`,
        method: "POST",
        body: { applicationId },
        silentSuccess: true,
      });
      set({ isLoading: false });
      if (error) {
        set({ error });
        throw new Error(error);
      }
      return data;
    },

    getVerificationResults: async (applicationId: string) => {
      set({ isLoading: true, error: null });
      const { data, error } = await $fetch({
        url: `/api/admin/crm/kyc/applications/${applicationId}/result`,
        silentSuccess: true,
      });
      set({ isLoading: false });
      if (error) {
        set({ error });
        return [];
      }
      return data || [];
    },
  })
);
