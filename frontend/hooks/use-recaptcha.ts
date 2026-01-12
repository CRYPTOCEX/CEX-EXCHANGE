"use client";

import { useCallback } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useSettings } from "@/hooks/use-settings";

const recaptchaSiteKey = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY || "";

/**
 * reCAPTCHA v3 hook using react-google-recaptcha-v3 package
 */
export function useRecaptcha() {
  const { settings } = useSettings();
  const { executeRecaptcha: executeGoogleRecaptcha } = useGoogleReCaptcha();

  // Check if site key is configured (must be > 10 chars to be valid)
  const hasSiteKey = !!(recaptchaSiteKey && recaptchaSiteKey.trim().length > 10);

  // Check if reCAPTCHA is enabled from settings
  const isEnabledInSettings =
    settings?.googleRecaptchaStatus === true ||
    settings?.googleRecaptchaStatus === "true";

  // Only enabled if both settings say so AND we have a valid site key
  const isEnabled = isEnabledInSettings && hasSiteKey;

  // Whether the reCAPTCHA is ready to execute
  const isReady = !!executeGoogleRecaptcha;

  // Execute reCAPTCHA
  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    // If no valid site key or not ready, skip
    if (!hasSiteKey || !executeGoogleRecaptcha) {
      return null;
    }

    try {
      const token = await executeGoogleRecaptcha(action);
      return token;
    } catch (err) {
      console.error("reCAPTCHA execution failed:", err);
      throw err;
    }
  }, [hasSiteKey, executeGoogleRecaptcha]);

  return {
    isEnabled,
    isReady,
    executeRecaptcha,
    hasSiteKey,
  };
}

export default useRecaptcha;
