"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { m } from "framer-motion";
import { SettingsPage, SettingsPageConfig } from "@/components/admin/settings";
import { $fetch } from "@/lib/api";
import { PreflightDialog, type PreflightFinding } from "./preflight-dialog";
import {
  GEO_DEFAULT_SETTINGS,
  GEO_FIELD_DEFINITIONS,
  GEO_TAB_COLORS,
  GEO_TAB_ICONS,
  GEO_TABS,
} from "./settings";
import { useTranslations } from "next-intl";

/**
 * A STABLE empty object for the pending render.
 *
 * Not `settings ?? {}` inline: `SettingsPage` memoises its merged settings on
 * the identity of this prop and re-seeds its draft from that memo, so a fresh
 * literal on every render would re-run the merge and the draft reset on every
 * render of this page. One frozen constant makes the pending prop identity
 * constant too.
 */
const NO_SETTINGS_YET: Record<string, any> = Object.freeze({});

interface PolicySummary {
  enabled: boolean;
  mode: "BLOCKLIST" | "ALLOWLIST";
  activeRules: number;
  blockRules: number;
  allowRules: number;
  lookupApiKeySet: boolean;
  trustProxy: boolean;
}

interface DetectionEvidence {
  cdnHeaderObserved: boolean;
  lookupObserved: boolean;
  untrustedProxyObserved: boolean;
  privatePeerObserved: boolean;
}

interface PreflightResponse {
  safe: boolean;
  blocked: boolean;
  forceable: boolean;
  findings: PreflightFinding[];
  warnings: PreflightFinding[];
  detection: { evidence: DetectionEvidence; noCountryEverResolved: boolean };
}

/**
 * Warnings for the states that most often catch operators out.
 *
 * Each of these is a configuration that looks correct on the settings screen
 * but does not do what the operator believes. Surfacing them here is the
 * difference between a control that works and one that only appears to.
 */
function PolicyWarnings({
  summary,
  detection,
  loadFailed,
}: {
  summary: PolicySummary | null;
  detection: PreflightResponse["detection"] | null;
  loadFailed: boolean;
}) {
  const warnings: Array<{ tone: "danger" | "warn" | "info"; text: string }> = [];

  /**
   * A FAILED READ IS A BANNER, NOT A PAGE.
   *
   * This used to be the page's only rendering of the error case — the whole
   * screen replaced by a shield icon and a sentence — and it shared its branch
   * with `loading`, so the two were indistinguishable in the code AND on
   * screen. Demoting it to a warning beside the others means a broken read
   * leaves the operator looking at the same settings screen they asked for,
   * with an explicit "these are defaults, not your policy" instead of a dead
   * end they can only leave by pressing Back.
   */
  if (loadFailed) {
    warnings.push({
      tone: "danger",
      text: "The geographic restriction policy could not be read, so the fields below are showing platform defaults rather than your saved configuration. Refresh to try again — nothing has been changed.",
    });
  }

  /* Everything below needs a summary to be true about. While the read is in
     flight there is nothing to warn about yet, so these simply do not exist —
     they are not withheld content, they are content that has no subject. */
  if (summary) {
    if (summary.enabled && summary.activeRules === 0) {
      warnings.push({
        tone: "warn",
        text:
          summary.mode === "ALLOWLIST"
            ? "Enforcement is ON in allowlist mode with no permitted countries — every visitor is currently being blocked. Add the countries you serve immediately."
            : "Enforcement is ON but no countries are listed, so nothing is being blocked. Add the jurisdictions you need to restrict.",
      });
    }

    if (!summary.enabled && summary.activeRules > 0) {
      warnings.push({
        tone: "danger",
        text: `${summary.activeRules} ${summary.activeRules === 1 ? "country rule is" : "country rules are"} saved but enforcement is switched OFF — none of them are being applied.`,
      });
    }

    /* `trustProxy` is the EFFECTIVE policy (describeProxyTrust), not the raw
       env var. Proxy trust is derived from the TCP peer — a proxy on this
       machine is honoured with no configuration — so this is false only when
       an operator has explicitly set TRUST_PROXY=false and switched that off.
       The old copy read the absent env var as "not enabled" and told every
       correctly-configured install to set TRUST_PROXY=true, which is the one
       mode that believes a forwarding header from a PUBLIC peer. */
    if (summary.enabled && !summary.trustProxy) {
      warnings.push({
        tone: "info",
        text: "TRUST_PROXY=false is set, so forwarding headers are ignored even from a proxy on this machine — every visitor will appear to come from the proxy's address. Remove it to restore the default, or list your proxy's address in TRUST_PROXY_CIDRS if it sits on another host.",
      });
    }
  }

  /* WHETHER DETECTION WORKS IS A FACT, NOT A SETTING.
     ======================================================================
     Nothing on this screen could previously answer it. "Use CDN country
     headers" being on does not mean a CDN is in front of the server, and a
     lookup provider being selected does not mean it answers, that the key is
     still valid, or that the address it is given belongs to the visitor rather
     than to a reverse proxy. An operator therefore had no way to know that
     turning on the fail-closed switch would refuse every request — the screen
     looked correctly configured either way.

     These lines come from live decision telemetry: what the engine has
     actually managed to resolve on real traffic. */
  if (detection) {
    const { evidence } = detection;
    const resolves = evidence.cdnHeaderObserved || evidence.lookupObserved;

    if (summary?.enabled && !resolves) {
      warnings.push({
        tone: "danger",
        text: "Country detection is not working: no request has ever resolved to a country on this install, by CDN header or IP lookup. Every visitor is currently unplaceable, so any rule that depends on knowing a country cannot apply — and switching on \"block when the country cannot be determined\" would refuse the entire platform.",
      });
    } else if (resolves) {
      warnings.push({
        tone: "info",
        text: `Country detection is working via ${evidence.cdnHeaderObserved ? "CDN country headers" : "the IP lookup provider"}. Rules that depend on a visitor's country will apply.`,
      });
    }

    /* `privatePeerObserved` USED TO BE PART OF THIS CONDITION AND MUST NOT BE.
       With trust derived from the peer, a loopback peer is the NORMAL shape of
       a proxied request — the resolved visitor address is public — so ORing it
       in fired this banner on every healthy same-host Apache and nginx
       install. `untrustedProxyObserved` alone is the honest signal, and it is
       what the backend preflight gates its UNTRUSTED_PROXY finding on: a
       forwarding header arrived and the address we resolved is STILL private,
       so something in front of us is not being read. */
    if (evidence.untrustedProxyObserved) {
      warnings.push({
        tone: "warn",
        text: "Requests are arriving with forwarding headers, but the address the engine ends up with is still a private one — so it is geolocating your proxy rather than your visitors. Forwarding headers are honoured from a proxy on this machine with no configuration; if yours is on another host, add its address to TRUST_PROXY_CIDRS and restart before relying on any rule.",
      });
    }
  }

  if (!warnings.length) return null;

  const tones = {
    danger: "border-destructive/30 bg-destructive/10 text-destructive-ink",
    warn: "border-warning/30 bg-warning/10 text-warning-ink",
    info: "border-info/30 bg-info/10 text-info-ink",
  };

  return (
    <>
      {warnings.map((warning, index) => (
        <m.div
          key={index}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${tones[warning.tone]}`}
        >
          {warning.tone === "info" ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="text-sm leading-relaxed">{warning.text}</p>
        </m.div>
      ))}
    </>
  );
}

export default function GeoRestrictionSettingsClient() {
  const t = useTranslations("dashboard_admin");
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [summary, setSummary] = useState<PolicySummary | null>(null);
  const [detection, setDetection] = useState<PreflightResponse["detection"] | null>(
    null
  );
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Bridges the modal back to the awaiting save.
   *
   * `onBeforeSaveAsync` has to return a decision the operator has not made
   * yet, so the promise is parked here and settled by whichever dialog button
   * they press. A ref rather than state because resolving it must not depend on
   * a re-render having happened first.
   */
  const decisionRef = useRef<((proceed: boolean) => void) | null>(null);

  const settleDecision = useCallback((proceed: boolean) => {
    const resolve = decisionRef.current;
    decisionRef.current = null;
    setPreflightOpen(false);
    resolve?.(proceed);
  }, []);
  /* LOADING AND FAILED ARE NOT THE SAME STATE, and until now this page had no
     way to say so: both were `!settings`. They need separate flags because
     they want opposite treatments — one is transient and silent, the other is
     terminal and has to be told to the operator. */
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await $fetch<{
      settings: Record<string, any>;
      summary: PolicySummary;
    }>({
      url: "/api/admin/system/geo-restriction/settings",
      silent: true,
    });

    // $fetch never throws — it always resolves with {data, error} — so the
    // error branch has to be handled explicitly or a failed load would render
    // as an empty, all-defaults policy that looks authoritative.
    if (!error && data?.settings) {
      setSettings(data.settings);
      setSummary(data.summary ?? null);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Detection health on arrival, so the operator learns whether their install
     can determine a country BEFORE they configure a policy that assumes it
     can. An empty body is a valid preflight request — it analyses nothing and
     reports the live telemetry, which is exactly what is wanted here. */
  useEffect(() => {
    void (async () => {
      const { data } = await $fetch<PreflightResponse>({
        url: "/api/admin/system/geo-restriction/settings/preflight",
        method: "POST",
        body: {},
        silent: true,
      });
      if (data?.detection) setDetection(data.detection);
    })();
  }, []);

  /**
   * ASK THE SERVER WHAT THIS WOULD DO, THEN ASK THE OPERATOR.
   *
   * The backend refuses a genuinely catastrophic save on its own, so this is
   * not the security boundary — it is the part that makes the refusal
   * comprehensible, and the only part that can surface the findings which are
   * serious but legitimate (those let the save succeed, so without this they
   * would be invisible at the one moment they could change a decision).
   *
   * Returning null abandons the save with the form untouched.
   */
  const gateSave = useCallback(
    async (payload: Record<string, any>): Promise<Record<string, any> | null> => {
      const { data, error } = await $fetch<PreflightResponse>({
        url: "/api/admin/system/geo-restriction/settings/preflight",
        method: "POST",
        body: payload,
        silent: true,
      });

      // A preflight that cannot be reached must not become a save that cannot
      // be made: the PUT enforces the same rules server-side, so letting the
      // save proceed loses the explanation, never the protection.
      if (error || !data) return payload;

      if (data.detection) setDetection(data.detection);
      if (!data.blocked && data.warnings.length === 0) return payload;

      setPreflight(data);
      setPreflightOpen(true);

      const proceed = await new Promise<boolean>((resolve) => {
        decisionRef.current = resolve;
      });
      if (!proceed) return null;

      // `force` is only meaningful when something forceable is blocking; the
      // PUT ignores it otherwise, and sending it unconditionally would turn
      // every acknowledged warning into a standing override.
      return data.blocked ? { ...payload, force: true } : payload;
    },
    []
  );

  /**
   * Built here rather than at module scope because it closes over `gateSave`.
   *
   * Memoised on that one stable callback: `SettingsPage` re-seeds its editing
   * draft from props, so handing it a fresh config object on every render would
   * reset the form under the operator mid-edit.
   */
  const geoSettingsConfig: SettingsPageConfig = React.useMemo(
    () => ({
      title: t("geographic_restrictions"),
      description:
        t("control_which_jurisdictions_can_access_the"),
      backUrl: "/admin/system/geo-restriction",
      apiEndpoint: "/api/admin/system/geo-restriction/settings",
      tabs: GEO_TABS,
      fields: GEO_FIELD_DEFINITIONS,
      tabColors: GEO_TAB_COLORS,
      defaultValues: GEO_DEFAULT_SETTINGS,
      onBeforeSaveAsync: gateSave,
    }),
    [gateSave]
  );

  /**
   * ONE TREE, BOTH STATES.
   * ==========================================================================
   *
   * What was here: `if (loading || !settings) return <80vh spinner>`. Three
   * separate defects stacked on one line.
   *
   *  1. A FULL-VIEWPORT SWAP. The pending state was an `h-[80vh]` centring
   *     box, so the page was 80% of the viewport tall and then became whatever
   *     the settings form is — hero, tab bar, a dozen field cards. Nothing on
   *     screen during the wait survived into the loaded state, so 100% of the
   *     final layout arrived as shift. This was the highest-scoring file in
   *     the whole repo scan for exactly that reason.
   *
   *  2. A SPINNER STANDING IN FOR A PAGE. A `Loader2` reserves no shape at
   *     all. The one thing this route unambiguously knows before any fetch —
   *     that it is the Geographic Restrictions settings screen, with these
   *     tabs and these field labels — is static config in this very file
   *     (`GEO_SETTINGS_CONFIG`), and it was being withheld anyway.
   *
   *  3. `loading || !settings` CONFLATED PENDING WITH FAILED. The two branches
   *     inside then tried to un-conflate them by re-testing `loading` for the
   *     icon and both strings, which is the tell: the code already knew they
   *     were different states and had put them in the same box.
   *
   * `SettingsPage` lives under `components/**` and takes no `loading` prop, so
   * the swap is removed the way the component already supports: `settings` is
   * merged over `config.defaultValues`, and `{}` merges to exactly the
   * defaults — the same screen a site that has never configured geo-blocking
   * sees. The chrome is therefore identical in both states and only the field
   * VALUES settle. Editing during that window is not lost work either:
   * SettingsPage re-seeds its draft from the merged settings, and its save
   * affordance only exists once a field has actually been touched.
   */
  return (
    <>
      <SettingsPage
        config={geoSettingsConfig}
        settings={settings ?? NO_SETTINGS_YET}
        onSettingsChange={(updated) => {
          setSettings(updated);
          // Re-read the summary so the warnings above reflect the state that
          // was actually saved rather than what was on screen a moment ago.
          void load();
        }}
        tabIcons={GEO_TAB_ICONS}
        tabDescriptions={Object.fromEntries(
          GEO_TABS.map((tab) => [tab.id, tab.description || ""])
        )}
        alertContent={
          <PolicyWarnings
            summary={summary}
            detection={detection}
            loadFailed={!loading && loadFailed}
          />
        }
      />

      <PreflightDialog
        open={preflightOpen}
        onOpenChange={setPreflightOpen}
        findings={preflight?.findings ?? []}
        warnings={preflight?.warnings ?? []}
        forceable={preflight?.forceable ?? false}
        onConfirm={() => settleDecision(true)}
        onCancel={() => settleDecision(false)}
      />
    </>
  );
}
