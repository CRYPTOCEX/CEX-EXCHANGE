"use client";

import React, { useEffect, useState } from "react";
import { Globe2, Mail, ShieldAlert } from "lucide-react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loadable } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

interface GeoStatus {
  enabled: boolean;
  restricted: boolean;
  countryCode: string | null;
  countryName: string | null;
  reasonCode: string;
  title: string;
  message: string;
  contactEmail: string;
}

/**
 * The compliance notice shown to visitors from a restricted jurisdiction.
 *
 * This page is deliberately plain and self-contained. It is the last thing a
 * blocked visitor sees, so it has to render without needing anything the
 * restriction itself would deny — the geo status endpoint it calls is exempt
 * from enforcement precisely so this page can load.
 *
 * It states the position, names the detected country (so a genuine
 * misdetection is visible rather than mysterious), and offers a contact route
 * where the operator has configured one. It does not apologise, speculate
 * about the law, or invite the visitor to work around the restriction.
 */
export default function RestrictedClient() {
  const t = useTranslations("utility_restricted");
  const [status, setStatus] = useState<GeoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const settings = useConfigStore((state) => state.settings);
  const siteName = settings?.siteName || "This service";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await $fetch<GeoStatus>({
        url: "/api/geo/status",
        silent: true,
      });
      if (cancelled) return;
      // $fetch resolves with {data, error} instead of throwing. On failure we
      // keep the generic wording below rather than claiming the visitor is
      // fine — this page is only ever reached because something refused them.
      if (!error && data) setStatus(data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const heading =
    status?.title?.trim() || t("service_not_available_in_your_region");

  const body =
    status?.message?.trim() ||
    t("is_not_available_in_your_jurisdiction", { siteName: String(siteName) });

  const where = status?.countryName || status?.countryCode;

  /**
   * THIS CARD IS VERTICALLY CENTRED, so every omission moves EVERYTHING.
   * ==========================================================================
   *
   * The wrapper is `flex min-h-screen items-center justify-center`, which means
   * the card has no fixed top edge — it is positioned by its own height. Two
   * blocks below the copy were gated on `!loading` (a 32px region pill and a
   * ~32px contact line), so as they arrived the card grew by up to 64px and
   * centring pushed the HEADING up by half of that. On the one page a blocked
   * visitor ever sees, the sentence explaining why they are blocked slid out
   * from under their eyes.
   *
   * Both are reserved while pending instead. Neither is guaranteed to exist
   * once the fetch lands — `/api/geo/status` can fail to name a country, and an
   * operator need not configure a contact address — so the pending state
   * assumes the COMMON shape (both present) and collapses once in the
   * uncommon one. That trade is deliberate: it takes the shift off every
   * visit and leaves it on the installs that have neither value, instead of
   * paying it on all of them.
   *
   * `loading || …` and not `!loading && …`: the condition reads "we either do
   * not know yet, or we know there is one", which is the actual question.
   */
  const showRegionChip = loading || Boolean(where);
  const showContactLine = loading || Boolean(status?.contactEmail);

  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto p-6">
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-lg text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-warning/20 blur-2xl" />
            <div className="relative rounded-3xl border bg-warning/10 p-7">
              <ShieldAlert className="h-12 w-12 text-warning" />
            </div>
          </div>
        </div>

        {/* The operator can override both of these from settings, so the
            generic wording is a FALLBACK for a failed lookup, not a pending
            state. Printing it while the request is still out and then swapping
            it for custom copy re-wraps the paragraph — this block is
            `leading-relaxed` at `text-sm md:text-base`, so one line either way
            is 24-26px on a centred card. */}
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
          <Loadable
            loading={loading}
            placeholder={t("service_not_available_in_your_region")}
          >
            {heading}
          </Loadable>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          <Loadable
            loading={loading}
            placeholder={t("is_not_available_in_your_jurisdiction", { siteName: String(siteName) })}
          >
            {body}
          </Loadable>
        </p>

        {showRegionChip && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" />
            <span>
              {t("detected_region")}:{" "}
              <strong className="font-medium">
                <Loadable loading={loading} placeholder={t("united_kingdom")}>
                  {where}
                </Loadable>
              </strong>
            </span>
          </div>
        )}

        {showContactLine && (
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {t("if_you_believe_this_is_incorrect_contact")}{" "}
            {/* ONE anchor, not `loading ? <span/> : <a/>`. An `<a>` with no
                `href` is valid HTML and lays out identically — it is simply
                not a link, which is exactly right while the address is
                unknown: `mailto:undefined` on a compliance notice is a dead
                contact route, and this is the one page where a visitor has
                nowhere else to go. */}
            <a
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              href={
                status?.contactEmail
                  ? `mailto:${status.contactEmail}`
                  : undefined
              }
            >
              <Mail className="h-3 w-3" />
              <Loadable loading={loading} placeholder="compliance@example.com">
                {status?.contactEmail}
              </Loadable>
            </a>
            .
          </p>
        )}

        {/* Kept reachable: an existing customer in a newly restricted country
            still needs a way to sign in and withdraw when the operator has
            left the wind-down carve-out enabled. */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/login">{t("sign_in_to_your_account")}</Link>
          </Button>
        </div>
      </m.div>
    </div>
  );
}
