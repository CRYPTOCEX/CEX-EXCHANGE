"use client";

import { $fetch } from "@/lib/api";
import { hasFeature, isUserKycApproved } from "@/utils/kyc";
import { clearWalletCacheOnUpdate } from "@/hooks/use-wallet-cache";

/**
 * Converts user data to the format expected by KYC utility functions.
 * The backend now sends kyc.level as an object, so we preserve that structure.
 */
function convertToKycUserType(user: User | null): any {
  if (!user) return null;

  return {
    ...user,
    kyc: user.kyc ? {
      status: user.kyc.status || '',
      level: user.kyc.level ? {
        level: user.kyc.level.level ?? 0,
        features: user.kyc.level.features || user.featureAccess || []
      } : null
    } : null,
    kycLevel: user.kycLevel ?? 0,
    featureAccess: user.featureAccess || []
  };
}
import { create } from "zustand";
import { useAuthBoot, type AuthBoot } from "@/store/auth-boot";

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
  /**
   * Has boot-time auth resolution happened yet?
   *
   * `isLoading` USED to carry this meaning, and it is why the distinction was
   * so easy to miss: it starts `true` and is cleared only by `setUser`. But
   * `login()` also sets it back to `true` while a request is in flight, so it
   * answers two different questions with one boolean — "we have not asked yet"
   * and "a sign-in attempt is running". `login-form.tsx` and
   * `register-form.tsx` read it for the second meaning; `use-kyc-gate.ts` and
   * `global-auth-detector.tsx` read it for the first.
   *
   * `authResolved` is only ever the first question, and it is one-way: once the
   * session is known it never goes back to `false`, not even mid-login. That is
   * what lets a component tell "guest" apart from "unknown" without having to
   * know whether some unrelated form is submitting.
   *
   * Seeded to `true` at boot from the server-resolved profile — see
   * `seedUserStoreFromServer` below and `store/auth-boot.ts`.
   */
  authResolved: boolean;
  error: string | null;
  // API key-specific loading & error
  apiKeyLoading: boolean;
  apiKeyError: string | null;
  activeTab: string;
  showTwoFactorSetup: boolean;
  setUser: (user: User | null) => void;
  /**
   * Re-read `/api/user/profile` and replace the cached user.
   *
   * THE ONLY WAY `user.providers` EVER CHANGES AFTER LOGIN. That array is the
   * app's copy of the `providerUser` rows — the source of truth for which
   * wallet addresses this account has PROVED it controls — and it is written
   * once, by the profile fetch that follows a login. Anything that adds or
   * removes a link (SIWE wallet linking, disconnecting one) must call this, or
   * the row exists on the server while every screen that reads `providers`
   * goes on rendering the state before it, until a full page reload.
   *
   * Resolves `false` on failure and leaves the cached user untouched: a
   * transient profile fetch failure must not sign the user out of the UI.
   */
  refreshUser: () => Promise<boolean>;
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
    message: string,
    signature: string
  ) => Promise<boolean>;
  disconnectWallet: (address: string) => Promise<boolean>;
  // Authentication functions
  login: (email: string, password: string, captcha?: {
    provider: string;
    token?: string;
    solution?: { challenge: string; nonce: number; hash: string };
  } | null) => Promise<boolean | { requiresTwoFactor: true; twoFactorToken: string; twoFactor: { enabled: true; type: string }; message: string; delivered?: boolean; deliveryError?: string; deliveryHint?: string }>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    ref?: string;
    captcha?: {
    provider: string;
    token?: string;
    solution?: { challenge: string; nonce: number; hash: string };
  };
  }) => Promise<{ success: boolean; data: any; userLoggedIn?: boolean }>;

  // New password reset functions
  requestPasswordReset: (email: string) => Promise<boolean>;
  verifyResetToken: (token: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
}

// Memoize expensive calculations
export const calculateSecurityScoreImpl = (user: User | null): number => {
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

export const calculateProfileCompletionImpl = (user: User | null): number => {
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

/**
 * The permission check, as a pure function of (user, apiKeys).
 *
 * It used to live only inside the store action, where it reads `get()`. That is
 * fine on the client — one browser tab, one user — but useless on the server,
 * where the module store must stay empty (see `store/auth-boot.ts` for why) and
 * the answer has to come from the per-request profile instead. Both callers now
 * go through this, so there is exactly one definition of the rule and the
 * server and the client cannot drift apart.
 */
function hasPermissionFor(
  user: User | null,
  apiKeys: apiKeyAttributes[],
  permission: string
): boolean {
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
}

/**
 * The store's own initial state object, captured so the boot seed can be built
 * from it. `getInitialState()` is NOT a safe substitute: it is overridden below
 * to return the boot snapshot once one exists.
 */
let baseInitialState: UserState | null = null;

/**
 * The snapshot React reads for `getServerSnapshot`, once the client has been
 * seeded. See `seedUserStoreFromServer` for why this has to exist as a separate
 * frozen object rather than just being `getState()`.
 */
let bootSnapshot: UserState | null = null;

const useUserStoreBase = create<UserState>((set, get, api) => {
  /*
   * `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` — and
   * zustand's React binding passes `api.getInitialState` as the THIRD argument.
   * React calls that third one not only on the server but ALSO for the client's
   * hydration render, precisely so the hydrating tree reproduces the server
   * HTML. That means seeding `setState` alone is not enough: the hydration pass
   * would still read the pristine `user: null` initial state, disagree with the
   * server HTML we are about to start seeding, and turn today's harmless
   * post-hydration flip into a real hydration mismatch across all 118
   * consumers.
   *
   * So the boot seed has to move the INITIAL snapshot too, and the only handle
   * on it is `api.getInitialState`. Overriding it here is the same trick the
   * `persist` middleware uses on line 380 of zustand's own middleware.js, for
   * the same reason.
   */
  api.getInitialState = () => bootSnapshot ?? (baseInitialState as UserState);

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

  const initial: UserState = {
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
    ],
    securityScore: 0,
    profileCompletion: 0,
    isLoading: true,
    // The pristine value. `false` here means "nobody has asked yet", which is
    // true of a store that has just been constructed. `seedUserStoreFromServer`
    // flips it during the very first client render, so no component in the app
    // actually observes it — it only survives for trees rendered outside the
    // root layout's providers.
    authResolved: false,
    error: null,
    apiKeyLoading: false,
    apiKeyError: null,
    activeTab: "dashboard",
    showTwoFactorSetup: false,

    setUser: (user) =>
      set({
        user,
        isLoading: false,
        // Any explicit setUser — boot seed, login, logout, checkout — is an
        // ANSWER to "who is signed in?", including `setUser(null)`.
        authResolved: true,
        error: null,
      }),

    refreshUser: async () => {
      const { data, error } = await $fetch({
        url: "/api/user/profile",
        method: "GET",
        silent: true,
        silentSuccess: true,
      });
      if (error || !data) return false;
      // `setUser`, not a partial merge: the profile route returns the whole
      // user, and merging would keep stale entries of any array it shrank —
      // `providers` after an address is UNLINKED being exactly that case.
      get().setUser(data as User);
      get().calculateSecurityScore();
      get().calculateProfileCompletion();
      return true;
    },

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
        // Clear the per-currency wallet cache so wallet data does not bleed
        // across users in a shared tab/session.
        clearWalletCacheOnUpdate();
        set({
          user: null,
          apiKeys: [],
          securityScore: 0,
          profileCompletion: 0,
          // Signed out is a RESOLVED state, not an unknown one. Without this
          // the flag would stay wherever it was and a post-logout render could
          // not tell "definitely nobody" from "still asking".
          authResolved: true,
        });
        return true;
      }
      return false;
    },

    hasPermission: (permission: string) => {
      const { user, apiKeys } = get();
      return hasPermissionFor(user, apiKeys, permission);
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

    connectWallet: async (message: string, signature: string) => {
      try {
        const { data, error } = await $fetch({
          url: "/api/user/profile/wallet/connect",
          method: "POST",
          body: { message, signature },
        });
        if (error) {
          console.error("Error connecting wallet:", error);
          return false;
        }
        /*
          THE LINK IS NOT VISIBLE UNTIL THIS RUNS, and for a while it did not.
          The row lands in `providerUser`, the DEX quote route starts accepting
          the taker — and the wallet tab went on offering "Link wallet" and the
          swap ticket went on demanding one, because both read `user.providers`
          and nothing had refreshed it since login. Two screens telling a user
          to do something they had just done.
        */
        await get().refreshUser();
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
        // Same reason as connectWallet: `providers` shrank on the server.
        await get().refreshUser();
        return true;
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
        return false;
      }
    },

    // Authentication functions
    login: async (email: string, password: string, captcha?: {
    provider: string;
    token?: string;
    solution?: { challenge: string; nonce: number; hash: string };
  } | null) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await $fetch({
          url: "/api/auth/login",
          method: "POST",
          body: { email, password, captcha: captcha || undefined },
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

    // Note: Google login is handled directly in components via the signInWithGoogle utility

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

  baseInitialState = initial;
  return initial;
});

/* ==========================================================================
 * BOOT-TIME AUTH RESOLUTION
 * ==========================================================================
 *
 * Two halves that MUST agree, because React compares the server HTML with the
 * client's first render and repairs (loudly) any difference:
 *
 *   server  →  `useUserStore` reads the per-request `AuthBoot` context.
 *              The module store is never touched. It cannot be: one Node
 *              process serves every concurrent request from the same object.
 *
 *   client  →  `seedUserStoreFromServer` writes the same profile into the
 *              module store during `Providers`' render, BEFORE any consumer
 *              below it renders. One tab, one user, so the singleton is right.
 *
 * The two produce identical answers for every selector, which is the whole
 * point: the server stops rendering a signed-out page for a signed-in user,
 * and the client stops correcting it after paint.
 * ======================================================================== */

let clientBootSeeded = false;

/**
 * Seed the client store from the session the SERVER already resolved.
 *
 * Call this from a render, not an effect. An effect runs after hydration and
 * after paint, which is exactly the window this change exists to delete.
 *
 * `typeof window !== "undefined"` IS LOAD-BEARING. Do not "simplify" it away.
 * `useUserStore` is a module-scope singleton, and in the SSR bundle that module
 * is shared by every request being rendered concurrently in the process.
 * Writing a profile into it on the server publishes one visitor's name, role
 * and permission list into another visitor's HTML. This guard is the only thing
 * standing between here and that; the server gets its copy through React
 * context instead (see `store/auth-boot.ts`), which is per-render-tree by
 * construction and therefore cannot leak.
 */
export function seedUserStoreFromServer(profile: User | null): void {
  if (typeof window === "undefined") return;
  if (clientBootSeeded) return;
  if (!baseInitialState) return;
  clientBootSeeded = true;

  /*
   * Build the snapshot from the PRISTINE initial state, then install it as both
   * the live state and the hydration snapshot.
   *
   * `replace: true` matters: it makes `getState()` and `getInitialState()`
   * return the SAME object, so the consistency check React runs right after
   * hydration sees no change and schedules no extra render. A partial `set`
   * would produce an equal-but-not-identical object and force every
   * whole-state consumer (`useUserStore()` with no selector) to re-render once
   * for nothing.
   *
   * Note that the actions carried over from `baseInitialState` — `hasPermission`,
   * `hasKyc`, `canAccessFeature` — read through `get()`, so they answer against
   * the live state and stay correct after a later login or logout. They are NOT
   * bound to `profile` here, deliberately.
   */
  bootSnapshot = {
    ...baseInitialState,
    user: profile,
    isLoading: false,
    authResolved: true,
  };
  useUserStoreBase.setState(bootSnapshot, true);
}

/**
 * The server-side view of the store for one request.
 *
 * Memoised on the `AuthBoot` object, which `Providers` holds stable for the
 * lifetime of a render tree, so every consumer in one request sees the same
 * object identity and a selector returning a derived value cannot thrash.
 */
const serverStateByBoot = new WeakMap<AuthBoot, UserState>();

function serverStateFor(boot: AuthBoot): UserState {
  const cached = serverStateByBoot.get(boot);
  if (cached) return cached;

  const profile = boot.profile;
  const state: UserState = {
    ...(baseInitialState as UserState),
    user: profile,
    isLoading: false,
    authResolved: true,
    /*
     * The store's own versions of these three close over `get()`, which on the
     * server returns the deliberately-empty module state — so they would answer
     * "no permission", "no KYC" for a Super Admin. Re-bind them to this
     * request's profile. The results are identical to what the client computes
     * from its seeded store, which is what keeps hydration quiet.
     *
     * `apiKeys` is intentionally `[]`: the server never fetches them, and the
     * client's seeded store starts empty too. Same input, same answer.
     */
    hasPermission: (permission: string) =>
      hasPermissionFor(profile, [], permission),
    hasKyc: () => isUserKycApproved(convertToKycUserType(profile)),
    canAccessFeature: (feature: string) =>
      hasFeature(convertToKycUserType(profile), feature),
  };

  serverStateByBoot.set(boot, state);
  return state;
}

/**
 * `useUserStore`, with the server reading the per-request session.
 *
 * Every one of the 118 call sites keeps its exact shape — `useUserStore(s =>
 * s.user)`, `useUserStore()`, `useUserStore.getState()`. Only where the answer
 * comes from on the server changes.
 *
 * Both hooks are called unconditionally on both sides; only the returned value
 * branches, so hook order is identical everywhere and the rules of hooks hold.
 */
function useUserStoreWithBoot(selector?: (state: UserState) => unknown) {
  const boot = useAuthBoot();
  const clientSlice = useUserStoreBase(selector as any);

  if (typeof window === "undefined" && boot.resolved) {
    const state = serverStateFor(boot);
    return selector ? selector(state) : state;
  }

  return clientSlice;
}

export const useUserStore = Object.assign(
  useUserStoreWithBoot,
  useUserStoreBase
) as unknown as typeof useUserStoreBase;
