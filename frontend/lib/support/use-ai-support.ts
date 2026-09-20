"use client";

import { useMemo } from "react";
import { useConfigStore } from "@/store/config";

/**
 * Whether the AI support agent is available, and on which channel.
 *
 * ---------------------------------------------------------------------------
 * THIS IS A HINT, NOT THE GATE
 * ---------------------------------------------------------------------------
 * It answers "should this surface advertise an assistant at all" — copy on the
 * support hub, a line in the composer — from settings the config store already
 * holds, with no extra request. The AUTHORITATIVE answer for a specific
 * conversation is `GET /api/ai/support/session/:id`, which additionally knows
 * the licence, the autonomy mode and whether a person has taken over. Anything
 * that decides what the customer is TOLD about who is writing must use that.
 *
 * ---------------------------------------------------------------------------
 * EVERY VALUE HERE IS A STRING
 * ---------------------------------------------------------------------------
 * `settings` rows are TEXT. `Boolean("false")` is `true`, so reading these
 * directly turns every switched-OFF toggle on — which for `aiSupportEnabled`
 * would advertise an assistant on every install that has deliberately disabled
 * it. `toBool` mirrors the backend's coercion in
 * `(ext)/ai/support/utils/settings.ts` exactly.
 *
 * The defaults mirror `AI_SUPPORT_SETTINGS_DEFAULTS`: the master switch and
 * live chat ship OFF, tickets ship ON. A missing row means "never configured",
 * which is the default, not "enabled".
 */

function toBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const v = String(value).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export interface AiSupportAvailability {
  /** The addon is installed and switched on in the extensions table. */
  installed: boolean;
  /** Master switch, addon present. */
  enabled: boolean;
  /** The agent may answer in the floating chat widget. */
  liveChat: boolean;
  /** The agent may answer on ticket threads. */
  tickets: boolean;
}

export function useAiSupport(): AiSupportAvailability {
  const settings = useConfigStore((state) => state.settings);
  const extensions = useConfigStore((state) => state.extensions);

  return useMemo(() => {
    const installed = Array.isArray(extensions)
      ? extensions.includes("ai_support")
      : false;
    const enabled = installed && toBool(settings?.aiSupportEnabled, false);

    return {
      installed,
      enabled,
      liveChat: enabled && toBool(settings?.aiSupportLiveChatEnabled, false),
      tickets: enabled && toBool(settings?.aiSupportTicketsEnabled, true),
    };
  }, [settings, extensions]);
}
