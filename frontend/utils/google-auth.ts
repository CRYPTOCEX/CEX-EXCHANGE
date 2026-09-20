/*
 * Google sign-in for the web client.
 *
 * The rule this file exists to obey: a browser only lets you open a popup while
 * the user's tap is still "active". That activation is spent by the first
 * network round trip, and mobile Safari and Android Chrome enforce it far more
 * strictly than desktop does.
 *
 * The previous implementation opened its popup from inside an asynchronous
 * Google One Tap notification callback, three hops and two round trips after
 * the tap — so the popup was already blocked by the time it was requested, and
 * mobile sign-in could not work at any point. It also led with One Tap, which
 * cannot display at all on iOS Safari (third-party cookies for
 * accounts.google.com are blocked outright), and branched on One Tap moment
 * getters that FedCM no longer reports, so most taps simply hung until a 120
 * second timeout that then reported itself as a user cancellation.
 *
 * What this does instead:
 *   - the GIS script is preloaded on mount, so it is warm before any tap
 *   - the token client is built ahead of time
 *   - requestAccessToken() is called SYNCHRONOUSLY from the click handler, so
 *     the popup opens inside the gesture that authorised it
 *   - One Tap is not in the click path at all
 *
 * The result is an OAuth access token. The backend re-fetches the profile from
 * Google itself and checks the token's audience, so we deliberately send only
 * the token and never a client-supplied profile.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";
const SCRIPT_ID = "google-auth-script";
const GOOGLE_SCOPE = "openid email profile";
const SCRIPT_TIMEOUT_MS = 15000;
/*
 * A popup that never reports back — the tab was switched away and abandoned,
 * which is ordinary on a phone — would otherwise leave the promise pending and
 * the button disabled for the life of the page. Long enough that a slow but
 * genuine sign-in is never cut off.
 */
const TOKEN_TIMEOUT_MS = 180000;

export type GoogleAuthErrorCode =
  | "cancelled"
  | "popup_blocked"
  | "not_configured"
  | "not_ready"
  | "unsupported_browser"
  | "script_failed"
  | "failed";

/**
 * Carries a machine-readable `code` so callers never have to substring-match
 * the message. The old code decided whether to show a toast by testing for the
 * word "cancelled", which meant a two-minute timeout was reported to the user
 * as nothing at all.
 */
export class GoogleAuthError extends Error {
  code: GoogleAuthErrorCode;

  constructor(code: GoogleAuthErrorCode, message: string) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
  }
}

export interface GoogleAuthResponse {
  access_token: string;
}

/**
 * Browsers embedded in another app (Instagram, Facebook, TikTok, …). Google
 * refuses OAuth in these with `disallowed_useragent`, and no fallback can
 * change that — the only real remedy is to open the site in the system
 * browser, so we detect it and say so rather than failing obscurely.
 */
export function isEmbeddedBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /(FBAN|FBAV|FB_IAB|FBIOS|Instagram|LinkedInApp|Line\/|TikTok|Snapchat|MicroMessenger|WeChat|Pinterest|GSA\/)/i.test(
    ua
  );
}

let scriptPromise: Promise<void> | null = null;

/**
 * The real readiness test. `google.accounts` alone is not enough: the popup
 * flow lives on `google.accounts.oauth2`, so treating the parent object as
 * "ready" would let getTokenClient() return null forever and wedge every tap
 * on "please tap again".
 */
function isGisReady(): boolean {
  return !!(window as any).google?.accounts?.oauth2;
}

function ensurePreconnect(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("google-auth-preconnect")) return;
  const link = document.createElement("link");
  link.id = "google-auth-preconnect";
  link.rel = "preconnect";
  link.href = "https://accounts.google.com";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/**
 * Loads the GIS script once.
 *
 * The old version resolved as soon as a tag with this id EXISTED, so a tag that
 * was still in flight — or one whose load had failed — reported success and the
 * caller then died on "Google accounts API not available", permanently.
 *
 * Here the promise is cached for the in-flight case, every attempt starts from
 * a freshly created element (never one whose load/error events have already
 * fired and can never fire again), a timeout covers a request that neither
 * loads nor errors, and every failure removes the tag AND clears the cached
 * promise so the next attempt genuinely retries.
 */
export const loadGoogleAuthScript = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(
      new GoogleAuthError("failed", "Cannot load Google sign-in on the server")
    );
  }
  if (isGisReady()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    ensurePreconnect();

    /*
     * Always start from a FRESH element. Attaching listeners to a tag left over
     * from a previous attempt is a trap: its load/error events have already
     * fired, so they never fire again and the promise never settles — the
     * button would sit disabled for the life of the page. Every failure path
     * below removes the tag and clears `scriptPromise`, so a retry genuinely
     * retries.
     */
    document.getElementById(SCRIPT_ID)?.remove();

    const el = document.createElement("script");
    let settled = false;

    const finish = (error?: GoogleAuthError) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
      if (error) {
        el.remove();
        scriptPromise = null;
        reject(error);
      } else {
        resolve();
      }
    };

    function onLoad() {
      // Loaded, but the API we need may still be absent (a captive portal or a
      // proxy answering 200 with something that is not the GIS bundle).
      finish(
        isGisReady()
          ? undefined
          : new GoogleAuthError(
              "script_failed",
              "Google sign-in is unavailable right now. Please try again."
            )
      );
    }

    function onError() {
      finish(
        new GoogleAuthError(
          "script_failed",
          "Could not reach Google. Check your connection and try again."
        )
      );
    }

    // A request that neither loads nor errors (a hung captive portal) would
    // otherwise leave this pending forever.
    const timer = window.setTimeout(() => {
      finish(
        new GoogleAuthError(
          "script_failed",
          "Google sign-in took too long to load. Please try again."
        )
      );
    }, SCRIPT_TIMEOUT_MS);

    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);

    el.id = SCRIPT_ID;
    el.src = GSI_SRC;
    el.async = true;
    el.defer = true;
    document.body.appendChild(el);
  });

  return scriptPromise;
};

let tokenClient: any = null;
let tokenClientId: string | null = null;

/** Handlers for the sign-in currently in flight; GIS callbacks are global. */
let pending: {
  resolve: (value: GoogleAuthResponse) => void;
  reject: (error: GoogleAuthError) => void;
  timer: number;
  /** True when the script was not warm and the tap's activation may be spent. */
  coldStart: boolean;
} | null = null;

function settleSuccess(accessToken: string) {
  const p = pending;
  pending = null;
  if (p) {
    window.clearTimeout(p.timer);
    p.resolve({ access_token: accessToken });
  }
}

function settleFailure(error: GoogleAuthError) {
  const p = pending;
  pending = null;
  if (!p) return;
  window.clearTimeout(p.timer);
  /*
   * On the cold path the popup was requested after a network round trip, so a
   * refusal is far more likely to be a spent user activation than a blanket
   * pop-up block. Telling that user to change their pop-up settings sends them
   * after the wrong thing — the action that actually works is tapping again,
   * which is now instant because the script is cached.
   */
  if (p.coldStart && error.code === "popup_blocked") {
    p.reject(
      new GoogleAuthError("not_ready", "Google sign-in is ready — please tap again.")
    );
    return;
  }
  p.reject(error);
}

/** Starts the request and arms the watchdog. Must be called synchronously. */
function requestToken(
  client: any,
  coldStart: boolean,
  resolve: (value: GoogleAuthResponse) => void,
  reject: (error: GoogleAuthError) => void
) {
  const timer = window.setTimeout(() => {
    settleFailure(
      new GoogleAuthError(
        "failed",
        "Google sign-in timed out. Please try again."
      )
    );
  }, TOKEN_TIMEOUT_MS);

  pending = { resolve, reject, timer, coldStart };

  try {
    client.requestAccessToken();
  } catch (error: any) {
    settleFailure(
      new GoogleAuthError(
        "failed",
        error?.message || "Google sign-in could not be started"
      )
    );
  }
}

/**
 * Builds the token client once per client id. Created ahead of the tap so that
 * requestAccessToken() can run synchronously inside the gesture.
 */
function getTokenClient(clientId: string): any | null {
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) return null;
  if (tokenClient && tokenClientId === clientId) return tokenClient;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_SCOPE,
    // Explicit so a returning user gets the account chooser and never a fresh
    // consent screen on every sign-in.
    prompt: "select_account",
    callback: (response: any) => {
      if (response?.error) {
        settleFailure(
          new GoogleAuthError(
            "failed",
            response.error_description || response.error
          )
        );
        return;
      }
      if (response?.access_token) {
        settleSuccess(response.access_token);
        return;
      }
      settleFailure(
        new GoogleAuthError("failed", "Google did not return an access token")
      );
    },
    // Fires when the popup cannot open or the user closes it. Without this the
    // promise would hang and the button would stay disabled forever.
    error_callback: (error: any) => {
      const type = error?.type;
      if (type === "popup_closed") {
        settleFailure(new GoogleAuthError("cancelled", "Sign-in was cancelled"));
        return;
      }
      if (type === "popup_failed_to_open") {
        settleFailure(
          new GoogleAuthError(
            "popup_blocked",
            "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again."
          )
        );
        return;
      }
      settleFailure(
        new GoogleAuthError(
          "failed",
          error?.message || "Google sign-in could not be completed"
        )
      );
    },
  });
  tokenClientId = clientId;
  return tokenClient;
}

/**
 * Warms everything the click handler needs. Safe to call repeatedly; call it on
 * mount so the script and the token client are ready long before any tap.
 */
export function preloadGoogleAuth(clientId: string): void {
  if (!clientId || typeof window === "undefined") return;
  if (isEmbeddedBrowser()) return;
  loadGoogleAuthScript()
    .then(() => {
      getTokenClient(clientId);
    })
    .catch(() => {
      /* surfaced on the tap instead — preloading must never throw */
    });
}

/**
 * Starts Google sign-in. MUST be called directly from a click/tap handler,
 * with no await before it, or the popup will be blocked on mobile.
 */
export function signInWithGoogle(clientId: string): Promise<GoogleAuthResponse> {
  if (!clientId) {
    return Promise.reject(
      new GoogleAuthError(
        "not_configured",
        "Google sign-in is not configured on this site."
      )
    );
  }

  if (isEmbeddedBrowser()) {
    return Promise.reject(
      new GoogleAuthError(
        "unsupported_browser",
        "Google blocks sign-in inside in-app browsers. Open this page in Safari or Chrome and try again."
      )
    );
  }

  if (typeof window === "undefined") {
    return Promise.reject(
      new GoogleAuthError("failed", "Cannot sign in on the server")
    );
  }

  // A sign-in already in flight: abandon it rather than leaving it hanging.
  if (pending) {
    settleFailure(new GoogleAuthError("cancelled", "Sign-in restarted"));
  }

  const client = getTokenClient(clientId);

  if (client) {
    // The fast path, and the only one that reliably works on mobile: the popup
    // is requested synchronously, so the tap that authorised it is still live.
    return new Promise<GoogleAuthResponse>((resolve, reject) => {
      requestToken(client, false, resolve, reject);
    });
  }

  // Script was not warm yet — the preload has not finished, or it failed. We
  // load it now and still try, but the activation may already be spent, so a
  // refusal here is reported as "tap again" rather than as a pop-up block.
  return loadGoogleAuthScript().then(
    () =>
      new Promise<GoogleAuthResponse>((resolve, reject) => {
        const ready = getTokenClient(clientId);
        if (!ready) {
          reject(
            new GoogleAuthError(
              "not_ready",
              "Google sign-in is still loading. Please tap again."
            )
          );
          return;
        }
        requestToken(ready, true, resolve, reject);
      })
  );
}
