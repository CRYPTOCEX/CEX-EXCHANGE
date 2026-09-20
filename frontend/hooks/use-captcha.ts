"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { $fetch } from "@/lib/api";

export type CaptchaAction = "login" | "register" | "reset";

export interface PowSolution {
  challenge: string;
  nonce: number;
  hash: string;
}

/** What the auth routes accept as `body.captcha`. */
export interface CaptchaSubmission {
  provider: string;
  token?: string;
  solution?: PowSolution;
}

interface CaptchaConfig {
  provider: string;
  siteKey: string;
  enabled: boolean;
  challenge?: string;
  difficulty?: number;
  timestamp?: number;
  expiresIn?: number;
}

const VENDOR_PROVIDERS = ["turnstile", "recaptcha", "hcaptcha"];

// ---------------------------------------------------------------------------
// Proof of work
// ---------------------------------------------------------------------------

/**
 * The worker source.
 *
 * REWRITTEN TO STOP TAXING THE HONEST USER.
 *
 * The previous solver, per REJECTED nonce, converted the 32-byte digest to a
 * 64-character hex string and then expanded THAT into a 256-character binary
 * string, and ran a regex over it. Measured, that tripled the cost of a nonce:
 * ~101k hashes/sec became ~67k. The attacker's native solver does none of it —
 * it reads the first few bytes and stops — so the work the tax added landed
 * entirely on real users.
 *
 * This version counts leading zero bits straight off the Uint8Array and only
 * formats hex once, on the winning nonce. Same proof, same difficulty, same
 * bytes on the wire.
 *
 * It does NOT close the gap: an attacker still pays native `createHash` while a
 * browser pays an awaited `crypto.subtle.digest` per nonce, and that remains
 * roughly an order of magnitude per core. Proof-of-work is a price, not a
 * humanity test. Turnstile is the answer to bots; this is the answer to having
 * no keys configured.
 */
const POW_WORKER_SOURCE = `
  function leadingZeroBits(bytes) {
    let n = 0;
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0) { n += 8; continue; }
      n += Math.clz32(b) - 24;
      break;
    }
    return n;
  }

  function toHex(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
  }

  self.onmessage = async function (e) {
    const { challenge, difficulty, startNonce, batchSize } = e.data;
    const encoder = new TextEncoder();
    let nonce = startNonce;

    for (let i = 0; i < batchSize; i++) {
      const buf = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(challenge + ':' + nonce)
      );
      const bytes = new Uint8Array(buf);
      if (leadingZeroBits(bytes) >= difficulty) {
        self.postMessage({ found: true, nonce: nonce, hash: toHex(bytes) });
        return;
      }
      nonce++;
    }

    self.postMessage({ found: false, nonce: nonce });
  };
`;

/**
 * Solve a challenge in a worker.
 *
 * The budget is derived from the server's own `expiresIn` rather than being a
 * hardcoded 30s. The old constant was shorter than a high-difficulty solve on
 * anything but a fast desktop, so "High" silently failed a large share of real
 * signups — the form caught the rejection and aborted before the request went
 * out, which reads to the user as the site being broken.
 */
async function solvePow(
  challenge: string,
  difficulty: number,
  budgetMs: number
): Promise<PowSolution> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([POW_WORKER_SOURCE], {
      type: "application/javascript",
    });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    const batchSize = 50000;

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Challenge solving timed out"));
    }, budgetMs);

    worker.onmessage = (event) => {
      const { found, nonce, hash } = event.data;
      if (found) {
        cleanup();
        resolve({ challenge, nonce, hash });
        return;
      }
      worker.postMessage({
        challenge,
        difficulty,
        startNonce: nonce,
        batchSize,
      });
    };

    worker.onerror = (event) => {
      cleanup();
      reject(new Error(`Worker error: ${event.message}`));
    };

    worker.postMessage({ challenge, difficulty, startNonce: 0, batchSize });
  });
}

// ---------------------------------------------------------------------------
// Hosted providers
// ---------------------------------------------------------------------------

const scriptPromises = new Map<string, Promise<void>>();

/** Load a vendor script once per page, however many forms ask for it. */
function loadScript(src: string): Promise<void> {
  const existing = scriptPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever —
      // this fires for a transient network blip as readily as for a blocked
      // domain, and a cached rejection would keep the form broken until reload.
      scriptPromises.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(el);
  });

  scriptPromises.set(src, promise);
  return promise;
}

function vendorScriptUrl(provider: string, siteKey: string): string {
  switch (provider) {
    case "turnstile":
      return "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    case "hcaptcha":
      return "https://js.hcaptcha.com/1/api.js?render=explicit";
    case "recaptcha":
      return `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    default:
      return "";
  }
}

/**
 * Obtain a fresh token from the armed vendor.
 *
 * Always minted at SUBMIT time, never at mount. Vendor tokens are short-lived
 * (Turnstile's are good for 300s) and single-use, so a token captured when the
 * page loaded is routinely dead by the time somebody finishes typing a
 * password — and a dead token is indistinguishable, from the user's side, from
 * the captcha being broken.
 */
async function getVendorToken(
  provider: string,
  siteKey: string,
  action: CaptchaAction,
  container: HTMLElement | null
): Promise<string> {
  await loadScript(vendorScriptUrl(provider, siteKey));
  const w = window as any;

  if (provider === "recaptcha") {
    // v3 has no widget — it scores in the background and needs no container.
    return new Promise<string>((resolve, reject) => {
      if (!w.grecaptcha?.ready) {
        reject(new Error("reCAPTCHA failed to initialise"));
        return;
      }
      w.grecaptcha.ready(() => {
        w.grecaptcha
          .execute(siteKey, { action })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  if (!container) {
    throw new Error("Captcha container is not mounted");
  }

  const api = provider === "turnstile" ? w.turnstile : w.hcaptcha;
  if (!api?.render) {
    throw new Error(`${provider} failed to initialise`);
  }

  return new Promise<string>((resolve, reject) => {
    // A fresh widget per attempt: re-using one leaves the previous (spent)
    // token in place and the vendor answers `timeout-or-duplicate`.
    container.innerHTML = "";

    let widgetId: string | undefined;
    const settle = (fn: () => void) => {
      try {
        if (widgetId !== undefined) api.remove?.(widgetId);
      } catch {
        /* the widget is already gone; nothing to clean up */
      }
      fn();
    };

    const options: Record<string, any> = {
      sitekey: siteKey,
      callback: (token: string) => settle(() => resolve(token)),
      "error-callback": () =>
        settle(() => reject(new Error(`${provider} returned an error`))),
      "expired-callback": () =>
        settle(() => reject(new Error(`${provider} challenge expired`))),
    };

    if (provider === "turnstile") {
      // `interaction-only` keeps the widget invisible unless Cloudflare decides
      // this visitor has to prove something, which is the whole reason to
      // prefer Turnstile: the overwhelming majority of real users see nothing.
      options.action = action;
      options.appearance = "interaction-only";
      options.execution = "execute";
    } else {
      options.size = "invisible";
    }

    try {
      widgetId = api.render(container, options);
      api.execute?.(widgetId);
    } catch (error: any) {
      settle(() => reject(error));
    }
  });
}

// ---------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------

export function useCaptcha() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Learn the provider once so the container can be reserved before submit.
  // Failure here is not fatal — `getSubmission` re-fetches and is the authority.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await $fetch({
        url: "/api/auth/pow/challenge?action=login",
        method: "GET",
        silent: true,
      });
      if (!cancelled && data?.provider) setProvider(data.provider);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Produce whatever the server's armed provider expects, or null when no
   * captcha is configured.
   *
   * THROWS rather than returning null on failure, and the distinction is the
   * whole point. The previous hook returned `null` both when the captcha was
   * switched OFF and when it could not reach the server to ask — so a failed
   * config fetch looked exactly like "no captcha required" and the form posted
   * without one. Only an explicit `provider: "none"` yields null here.
   */
  const getSubmission = useCallback(
    async (action: CaptchaAction): Promise<CaptchaSubmission | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await $fetch({
          url: `/api/auth/pow/challenge?action=${action}`,
          method: "GET",
          silent: true,
        });

        if (fetchError || !data) {
          throw new Error(
            "Could not reach the security check. Please try again."
          );
        }

        const config = data as CaptchaConfig;

        if (!config.provider || config.provider === "none") return null;

        if (config.provider === "pow") {
          if (!config.enabled || !config.challenge || !config.difficulty) {
            throw new Error("Invalid security challenge received");
          }
          const budget = Math.max(15000, config.expiresIn ?? 300000);
          const solution = await solvePow(
            config.challenge,
            config.difficulty,
            budget
          );
          return { provider: "pow", solution };
        }

        if (VENDOR_PROVIDERS.includes(config.provider)) {
          if (!config.siteKey) {
            throw new Error(
              "The security check is not fully configured. Please contact support."
            );
          }
          const token = await getVendorToken(
            config.provider,
            config.siteKey,
            action,
            containerRef.current
          );
          return { provider: config.provider, token };
        }

        throw new Error(`Unsupported captcha provider: ${config.provider}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Security check failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    getSubmission,
    isLoading,
    error,
    provider,
    /** Attach to a <div> inside the form; the vendor widget mounts here. */
    containerRef,
    needsContainer: VENDOR_PROVIDERS.includes(provider),
  };
}
