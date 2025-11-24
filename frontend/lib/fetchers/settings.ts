import { cache } from "react";

interface SettingsData {
  [key: string]: any;
}

function getBaseURL() {
  const isDev = process.env.NODE_ENV === "development";
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

  if (isDev) {
    return `http://localhost:${backendPort}`;
  }

  // In production, use the same domain without backend port (reverse proxy handles it)
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";
}

export const getSettings = cache(async () => {
  const siteUrl = getBaseURL();

  if (!siteUrl) {
    console.error("SSR: No site URL configured for settings fetch");
    return { settings: {}, extensions: [], error: "No site URL configured" };
  }

  try {
    const apiUrl = `${siteUrl}/api/settings`;
    console.log("SSR: Fetching settings from:", apiUrl);

    const res = await fetch(apiUrl, {
      method: "GET",
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(
        `SSR: Failed to fetch /api/settings: ${res.status} ${res.statusText} from ${apiUrl}`
      );
      // Return empty defaults instead of throwing
      return { settings: {}, extensions: [], error: `HTTP ${res.status}` };
    }

    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      console.warn("SSR: Failed to parse settings response:", parseError);
      return {
        settings: {},
        extensions: [],
        error: "Failed to parse response",
      };
    }

    return { settings: data || {}, extensions: [], error: null };
  } catch (error) {
    console.warn(
      "SSR: Error fetching settings:",
      error instanceof Error ? error.message : error
    );
    // Return empty defaults instead of throwing
    return {
      settings: {},
      extensions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

function settingsToObject(
  settings: Setting[] | undefined
): Record<string, string> {
  if (!Array.isArray(settings)) return {};
  return settings.reduce(
    (obj, setting) => {
      obj[setting.key] = setting.value instanceof File ? "" : setting.value;
      return obj;
    },
    {} as Record<string, string>
  );
}
