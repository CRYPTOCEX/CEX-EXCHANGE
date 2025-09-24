"use client";

import { $fetch } from "@/lib/api";
import { hasFeature, isUserKycApproved } from "@/utils/kyc";

// Helper function to convert User to the format expected by KYC utils
function convertToKycUserType(user: User | null): any {
  if (!user) return null;
  
  return {
    ...user,
    kyc: {
      status: user.kyc?.status || '',
      level: {
        level: typeof user.kyc?.level === 'number' ? user.kyc.level : user.kyc?.level?.level,
        features: user.kyc?.level?.features || user.featureAccess || []
      }
    }
  };
}
import { create } from "zustand";

interface ApiPermission {
  label: string;
  value: string;
  description: string;
}

interface UserState {
  user: User | null;
  apiKeys: apiKeyAttributes[];
  apiPermissions: ApiPermission[];
  securityScore: number;
  profileCompletion: number;
  // Global loading & error (for non-api-key operations)
  isLoading: boolean;
  error: string | null;
  // API key-specific loading & error
  apiKeyLoading: boolean;
  apiKeyError: string | null;
  activeTab: string;
  showTwoFactorSetup: boolean;
  setUser: (user: User | null) => void;
  setActiveTab: (tab: string) => void;
  setShowTwoFactorSetup: (show: boolean) => void;
  hasKyc: () => boolean;
  canAccessFeature: (feature: string) => boolean;
  logout: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  calculateSecurityScore: () => void;
  calculateProfileCompletion: () => void;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  updateAvatar: (avatarUrl: string | null) => Promise<boolean>;
  fetchApiKeys: () => Promise<void>;
  createApiKey: (
    name: string,
    permissions: string[],
    ipWhitelist: string[],
    ipRestriction: boolean
  ) => Promise<apiKeyAttributes | void>;
  updateApiKey: (
    id: string,
    permissions: string[],
    ipWhitelist: string[],
    ipRestriction: boolean
  ) => Promise<apiKeyAttributes | void>;
  deleteApiKey: (id: string) => Promise<void>;
  connectWallet: (
    address: string,
    chainId: number | string
  ) => Promise<boolean>;
  disconnectWallet: (address: string) => Promise<boolean>;
  // Authentication functions
  login: (email: string, password: string) => Promise<boolean | { requiresTwoFactor: true; id: string; twoFactor: { enabled: true; type: string }; message: string }>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    ref?: string;
  }) => Promise<{ success: boolean; data: any; userLoggedIn?: boolean }>;

  // New password reset functions
  requestPasswordReset: (email: string) => Promise<boolean>;
  verifyResetToken: (token: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
}

// Memoize expensive calculations
const calculateSecurityScoreImpl = (user: User | null): number => {
  if (!user) return 0;
  let score = 0;
  // Base score for having an account
  score += 30;
  // 2FA enabled
  if (user.twoFactor?.enabled) score += 30;
  // Email verified
  if (user.emailVerified) score += 20;
  // Phone verified
  if (user.phoneVerified) score += 20;
  return score;
};

const calculateProfileCompletionImpl = (user: User | null): number => {
  if (!user) return 0;
  const fields = [
    user.firstName,
    user.lastName,
    user.email,
    user.phone,
    user.profile,
    user.avatar !== null && user.avatar !== "/user/placeholder.svg",
    user.emailVerified,
    user.phoneVerified,
    user.twoFactor?.enabled,
    !!user.walletAddress,
  ];
  const total = fields.length;
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / total) * 100);
};

export const useUserStore = create<UserState>((set, get) => {
  // Helper to ensure API key fields are in the correct format
  const normalizeApiKey = (apiKey: any) => {
    let permissions = apiKey.permissions;
    let ipWhitelist = apiKey.ipWhitelist;

    // Try parsing permissions if it's a string that looks like a JSON array.
    if (typeof permissions === "string") {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        // Fallback: split by comma if JSON parsing fails.
        permissions = permissions.split(",").map((p: string) => p.trim());
      }
    }
    if (!Array.isArray(permissions)) {
      permissions = [];
    }

    // Try parsing ipWhitelist if it's a string that looks like a JSON array.
    if (typeof ipWhitelist === "string") {
      try {
        ipWhitelist = JSON.parse(ipWhitelist);
      } catch {
        // Fallback: split by comma if JSON parsing fails.
        ipWhitelist = ipWhitelist.split(",").map((ip: string) => ip.trim());
      }
    }
    if (!Array.isArray(ipWhitelist)) {
      ipWhitelist = [];
    }

    return {
      ...apiKey,
      permissions,
      ipWhitelist,
    };
  };

  return {
    user: null,
    apiKeys: [],
    apiPermissions: [
      {
        label: "Trade",
        value: "trade",
        description: "Allows placing orders and trading on the exchange.",
      },
      {
        label: "Futures",
        value: "futures",
        description: "Allows trading in futures markets.",
      },
      {
        label: "Deposit",
        value: "deposit",
        description: "Allows viewing deposit addresses and history.",
      },
      {
        label: "Withdraw",
        value: "withdraw",
        description: "Allows withdrawals from the account.",
      },
      {
        label: "Transfer",
        value: "transfer",
        description: "Allows transfers between your accounts.",
      },
      {
        label: "Payment",
        value: "payment",
        description: "Allows creating and confirming payments.",
      },
    ],
    securityScore: 0,
    profileCompletion: 0,
    isLoading: true,
    error: null,
    apiKeyLoading: false,
    apiKeyError: null,
    activeTab: "dashboard",
    showTwoFactorSetup: false,

    setUser: (user) =>
      set({
        user,
        isLoading: false,
        error: null,
      }),

    setActiveTab: (tab) => set({ activeTab: tab }),

    setShowTwoFactorSetup: (show) => set({ showTwoFactorSetup: show }),

    hasKyc: () => {
      const { user } = get();
      return isUserKycApproved(convertToKycUserType(user));
    },
    canAccessFeature: (feature: string) => {
      const { user } = get();
      return hasFeature(convertToKycUserType(user), feature);
    },

    logout: async () => {
      const { data, error } = await $fetch({
        url: "/api/auth/logout",
        method: "POST",
      });
      if (!error) {
        set({
          user: null,
          apiKeys: [],
          securityScore: 0,
          profileCompletion: 0,
        });
        return true;
      }
      return false;
    },

    hasPermission: (permission: string) => {
      const { user, apiKeys } = get();

      // 1) If user is Super Admin, grant all permissions
      if (user?.role?.name === "Super Admin") {
        return true;
      }

      // 2) If user has no role, deny
      if (!user?.role) {
        return false;
      }

      // 3) Check role permissions first
      const userPermissions = user.role.permissions || [];

      // Handle both cases: permissions as objects [{id, name}] or as strings ["permission.name"]
      const hasRolePermission = userPermissions.some((p: any) => {
        if (typeof p === "string") {
          return p === permission;
        }
        if (typeof p === "object" && p.name) {
          return p.name === permission;
        }
        return false;
      });

      if (hasRolePermission) {
        return true;
      }

      // 4) Fallback to API key permissions
      return apiKeys.some((apiKey) => apiKey.permissions.includes(permission));
    },

    calculateSecurityScore: () => {
      const { user } = get();
      const score = calculateSecurityScoreImpl(user);
      set({ securityScore: score });
    },

    calculateProfileCompletion: () => {
      const { user } = get();
      const completion = calculateProfileCompletionImpl(user);
      set({ profileCompletion: completion });
    },

    updateUser: async (userData) => {
      try {
        const { data, error } = await $fetch({
          url: "/api/user/profile",
          method: "PUT",
          body: userData,
        });
        if (error) {
          set({ error });
          return false;
        }
        const { user } = get();
        if (!user) {
          set({ error: "User not logged in" });
          return false;
        }
        set({
          user: { ...user, ...userData },
          error: null,
        });
        get().calculateSecurityScore();
        get().calculateProfileCompletion();
        return true;
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to update user",
        });
        return false;
      }
    },

    updateAvatar: async (avatarUrl) => {
      try {
        const { data, error } = await $fetch({
          url: "/api/user/profile",
          method: "PUT",
          body: { avatar: avatarUrl },
        });
        if (error) {
          set({ error });
          return false;
        }
        const { user } = get();
        if (!user) {
          set({ error: "User not logged in" });
          return false;
        }
        set({
          user: { ...user, avatar: avatarUrl },
          error: null,
        });
        get().calculateProfileCompletion();
        return true;
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to update avatar",
        });
        return false;
      }
    },

    fetchApiKeys: async () => {
      set({ apiKeyLoading: true, apiKeyError: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/user/api-key",
          silentSuccess: true,
        });
        if (error) {
          set({ apiKeyError: error, apiKeyLoading: false });
          return;
        }
        const normalizedKeys = Array.isArray(data)
          ? data.map(normalizeApiKey)
          : [];
        set({ apiKeys: normalizedKeys, apiKeyLoading: false });
      } catch (error) {
        set({
          apiKeyError:
            error instanceof Error ? error.message : "Unknown error occurred",
          apiKeyLoading: false,
        });
      }
    },

    createApiKey: async (name, permissions, ipWhitelist, ipRestriction) => {
      set({ apiKeyLoading: true, apiKeyError: null });
      if (get().apiKeys.length >= 10) {
        set({
          apiKeyError: "Cannot create more than 10 API keys",
          apiKeyLoading: false,
        });
        return;
      }
      try {
        const { data, error } = await $fetch({
          url: "/api/user/api-key",
          method: "POST",
          body: { name, permissions, ipWhitelist, ipRestriction },
          silentSuccess: true,
        });
        if (error) {
          set({ apiKeyError: error, apiKeyLoading: false });
          return;
        }
        const normalizedKey = normalizeApiKey(data);
        set((state) => ({
          apiKeys: [...state.apiKeys, normalizedKey],
          apiKeyLoading: false,
        }));
        return normalizedKey;
      } catch (error) {
        set({
          apiKeyError:
            error instanceof Error ? error.message : "Unknown error occurred",
          apiKeyLoading: false,
        });
        return;
      }
    },

    updateApiKey: async (id, permissions, ipWhitelist, ipRestriction) => {
      set({ apiKeyLoading: true, apiKeyError: null });
      try {
        const { data, error } = await $fetch({
          url: `/api/user/api-key/${id}`,
          method: "PUT",
          body: { permissions, ipWhitelist, ipRestriction },
          silentSuccess: true,
        });
        if (error) {
          set({ apiKeyError: error, apiKeyLoading: false });
          return;
        }
        const normalizedKey = normalizeApiKey(data);
        set((state) => ({
          apiKeys: state.apiKeys.map((apiKey) =>
            apiKey.id === id ? normalizedKey : apiKey
          ),
          apiKeyLoading: false,
        }));
        return normalizedKey;
      } catch (error) {
        set({
          apiKeyError:
            error instanceof Error ? error.message : "Unknown error occurred",
          apiKeyLoading: false,
        });
        return;
      }
    },

    deleteApiKey: async (id: string) => {
      set({ apiKeyLoading: true, apiKeyError: null });
      const { error } = await $fetch({
        url: `/api/user/api-key/${id}`,
        method: "DELETE",
        silentSuccess: true,
      });
      if (error) {
        set({ apiKeyError: error, apiKeyLoading: false });
        return;
      }
      set((state) => ({
        apiKeys: state.apiKeys.filter((apiKey) => apiKey.id !== id),
        apiKeyLoading: false,
      }));
    },

    connectWallet: async (address: string, chainId: number | string) => {
      try {
        const { data, error } = await $fetch({
          url: "/api/user/profile/wallet/connect",
          method: "POST",
          body: { address, chainId },
        });
        if (error) {
          console.error("Error connecting wallet:", error);
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error connecting wallet:", error);
        return false;
      }
    },

    disconnectWallet: async (address: string) => {
      try {
        const { data, error } = await $fetch({
          url: "/api/user/profile/wallet/disconnect",
          method: "POST",
          body: { address },
        });
        if (error) {
          console.error("Error disconnecting wallet:", error);
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
        return false;
      }
    },

    // Authentication functions
    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/auth/login",
          method: "POST",
          body: { email, password },
          silentSuccess: true,
        });

        if (error) {
          set({ error, isLoading: false });
          return false;
        }

        // Check if 2FA is required
        if (data && data.twoFactor && data.twoFactor.enabled) {
          // Return the 2FA data instead of proceeding with login
          set({ isLoading: false, error: null });
          return { requiresTwoFactor: true, ...data };
        }

        // After successful login, fetch user profile
        try {
          const { data: profileData, error: profileError } = await $fetch({
            url: "/api/user/profile",
            method: "GET",
            silentSuccess: true,
          });

          if (profileError) {
            console.warn(
              "Failed to fetch user profile after login:",
              profileError
            );
            // Still consider login successful even if profile fetch fails
            set({ isLoading: false, error: null });
            return true;
          }

          if (profileData) {
            set({
              user: profileData,
              isLoading: false,
              error: null,
            });
            return true;
          }
        } catch (profileFetchError) {
          console.warn(
            "Error fetching user profile after login:",
            profileFetchError
          );
          // Still consider login successful even if profile fetch fails
        }

        set({ isLoading: false });
        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Login failed",
          isLoading: false,
        });
        return false;
      }
    },

    register: async (userData) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/auth/register",
          method: "POST",
          body: userData,
        });


        // First check if there's an explicit error
        if (error) {
          console.log("Registration error detected:", error);
          set({ error, isLoading: false });
          return { success: false, data: null, userLoggedIn: false };
        }

        // Check if response data indicates an error (fallback for HTTP 200 with error content)
        if (data && typeof data === "object") {
          // If the response contains just a message without success indicators, check if it's an error or success
          if (data.message && !data.cookies && !data.user && !data.accessToken) {
            const messageText = data.message.toLowerCase();
            
            // Success patterns - messages that indicate successful operations
            const successPatterns = [
              'successful',
              'success',
              'verify your email',
              'verification email sent',
              'registered successfully',
              'registration successful',
              'created successfully',
              'completed',
              'sent',
              'you have been registered successfully',
              'you have been logged in successfully',
              'email verified successfully',
              'password reset successfully',
              'email with reset instructions sent successfully',
              'otp saved successfully',
              'otp resent successfully',
              'you have been logged out',
              'user already registered but email not verified'
            ];
            
            // Error patterns - messages that indicate errors
            const errorPatterns = [
              'already in use',
              'not found',
              'invalid',
              'failed',
              'error',
              'denied',
              'forbidden',
              'unauthorized',
              'expired',
              'missing',
              'required'
            ];
            
            const looksLikeSuccess = successPatterns.some(pattern => messageText.includes(pattern));
            const looksLikeError = errorPatterns.some(pattern => messageText.includes(pattern));
            
            if (looksLikeError) {
              const errorMessage = data.message;
              console.log("Registration failed - error message in response:", errorMessage);
              set({ error: errorMessage, isLoading: false });
              return { success: false, data: null, userLoggedIn: false };
            } else if (looksLikeSuccess) {
              console.log("Registration succeeded - success message in response:", data.message);
              set({ isLoading: false, error: null });
              return { success: true, data: data, userLoggedIn: false };
            }
            // If it's neither clearly success nor error, fall through to default handling
          }
          
          // Check for explicit error fields
          if (data.error || data.errors || data.success === false) {
            const errorMessage = data.error || data.message || "Registration failed";
            console.log("Registration failed - error fields in response:", errorMessage);
            set({ error: errorMessage, isLoading: false });
            return { success: false, data: null, userLoggedIn: false };
          }
        }

        // If the backend returns tokens, it means the user is logged in
        if (data && data.cookies) {
          // Try to fetch user profile after successful registration with tokens
          try {
            const { data: profileData, error: profileError } = await $fetch({
              url: "/api/user/profile",
              method: "GET",
              silentSuccess: true,
            });

            if (profileData && !profileError) {
              set({
                user: profileData,
                isLoading: false,
                error: null,
              });
              return { success: true, data: data, userLoggedIn: true };
            }
          } catch (profileFetchError) {
            console.warn("Error fetching user profile after registration:", profileFetchError);
          }
        }

        set({ isLoading: false });
        return { success: true, data: data, userLoggedIn: false };
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Registration failed",
          isLoading: false,
        });
        return { success: false, data: null, userLoggedIn: false };
      }
    },

    // Note: Google login is now handled directly in components using openGoogleLoginPopup utility

    // New password reset functions
    requestPasswordReset: async (email: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/auth/reset",
          method: "POST",
          body: { email },
          silentSuccess: true,
        });

        set({ isLoading: false });

        if (error) {
          set({ error });
          return false;
        }

        return true;
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to request password reset",
          isLoading: false,
        });
        return false;
      }
    },

    verifyResetToken: async (token: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/auth/verify/reset",
          method: "POST",
          body: { token },
          silentSuccess: true,
        });

        set({ isLoading: false });

        if (error) {
          set({ error });
          return false;
        }

        return true;
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to verify reset token",
          isLoading: false,
        });
        return false;
      }
    },

    resetPassword: async (token: string, newPassword: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/auth/verify/reset",
          method: "POST",
          body: { token, newPassword },
          silentSuccess: true,
        });

        set({ isLoading: false });

        if (error) {
          set({ error });
          return false;
        }

        return true;
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to reset password",
          isLoading: false,
        });
        return false;
      }
    },
  };
});
