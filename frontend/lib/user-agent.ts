/**
 * Minimal, dependency-free User-Agent parser for surfacing the device/browser
 * behind a recorded login or security event. Not a substitute for true device
 * fingerprinting — just enough to make IP/device history readable for admins.
 */
export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
}

export function parseUserAgent(ua?: string | null): ParsedUserAgent {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown" };

  let os = "Unknown";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

  let device: ParsedUserAgent["device"] = "Desktop";
  if (/ipad|tablet|playbook|silk/i.test(ua)) device = "Tablet";
  else if (/mobile|iphone|ipod|android.*mobile|blackberry|windows phone/i.test(ua))
    device = "Mobile";

  return { browser, os, device };
}

/** Short human label like "Chrome on Windows 10/11 (Desktop)". */
export function describeUserAgent(ua?: string | null): string {
  const { browser, os, device } = parseUserAgent(ua);
  if (browser === "Unknown" && os === "Unknown") return "Unknown device";
  return `${browser} on ${os} (${device})`;
}
