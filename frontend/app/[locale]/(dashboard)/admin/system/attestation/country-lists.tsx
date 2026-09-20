"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Apple, Check, Copy, Globe2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { $fetch } from "@/lib/api";

/**
 * THE THREE COUNTRY LISTS, WHERE SOMEBODY CAN ACTUALLY COPY THEM.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `GET /api/admin/system/attestation/countries` derives the runtime allowlist,
 * the Apple storefront list and the Google Play targeting list from the one
 * attestation table, precisely so the three cannot drift apart.
 *
 * Nothing called it. The endpoint shipped, the lists were computed on request,
 * and the operator's only view of them was a table of rows they would have had
 * to fold by hand into two consoles. A derived list nobody can read is the same
 * as no derived list — the store consoles get typed into from memory, and the
 * drift the endpoint was written to prevent happens anyway.
 *
 * ---------------------------------------------------------------------------
 * WHY IT MATTERS MORE THAN IT LOOKS
 * ---------------------------------------------------------------------------
 * Google Play has enforced its crypto exchange and wallet policy since
 * 29 October 2025, so a live app targeting a country with no licence behind it
 * is a present takedown risk rather than a future one. Both directions of drift
 * are findings:
 *
 *   - listed somewhere the server refuses to serve — a reviewer opens the app
 *     in that storefront and sees a product that does nothing (Apple 2.1);
 *   - serving somewhere the app is not listed — distributing a regulated
 *     product into a country you told the store you do not operate in.
 *
 * We cannot audit this for an operator. Their app is submitted from their own
 * developer account under a name we do not know, and neither store exposes
 * another developer's targeting. What we can do is hand them the list they
 * should be comparing against.
 */

interface CountryLists {
  runtime: Record<string, string[]>;
  appleStorefronts: string[];
  playTargeting: string[];
  unattestedModules: string[];
}

/** A list an operator pastes into a store console. */
function ListRow({
  icon,
  label,
  codes,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  codes: string[];
  hint: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = codes.join(", ");

  const copy = useCallback(() => {
    if (!codes.length) return;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [codes.length, text]);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary" className="ml-auto">
          {codes.length}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={copy}
          disabled={!codes.length}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {codes.length ? (
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">{text}</p>
      ) : (
        /*
          An empty list is the DEFAULT-DENY state, not a loading state, and it
          has to read as a decision. An operator who sees a blank row and
          assumes the panel is broken will go and type countries into Play
          Console from memory, which is the exact failure this panel exists to
          stop.
        */
        <p className="text-xs text-muted-foreground">
          Nothing attested. Every regulated module is currently served to nobody, and
          the app should not be listed anywhere until a licence is recorded above.
        </p>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function AttestationCountryLists() {
  const [lists, setLists] = useState<CountryLists | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await $fetch<CountryLists>({
        url: "/api/admin/system/attestation/countries",
        silent: true,
      });
      if (cancelled) return;
      // `$fetch` resolves with { data, error } rather than throwing, so a
      // failed read has to be handled here. Showing an empty panel instead
      // would say "you are licensed nowhere", which is a different and much
      // more alarming claim than "we could not read it".
      if (error || !data) {
        setFailed(true);
        return;
      }
      setLists(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        The derived country lists could not be read. The attestations above are unaffected.
      </div>
    );
  }

  if (!lists) return null;

  const runtimeModules = Object.entries(lists.runtime).filter(([, codes]) => codes.length > 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Globe2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">Store targeting, derived from the rows above</span>
        <span className="text-xs text-muted-foreground">
          Paste these in rather than composing them — they and the runtime gate read the same table.
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ListRow
          icon={<Apple className="h-4 w-4 shrink-0 text-muted-foreground" />}
          label="Apple storefronts"
          codes={lists.appleStorefronts}
          hint="App Store Connect → Pricing and Availability. The union across modules: an app is listed where any part of it can be served."
        />
        <ListRow
          icon={<PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground" />}
          label="Google Play countries"
          codes={lists.playTargeting}
          hint="Play Console → Countries / regions, and the same evidence again in the Financial features declaration."
        />
      </div>

      {runtimeModules.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Runtime, per module — what the server will actually serve
          </span>
          <div className="flex flex-wrap gap-1.5">
            {runtimeModules.map(([moduleId, codes]) => (
              <Badge key={moduleId} variant="outline" className="font-normal">
                <span className="font-medium">{moduleId}</span>
                <span className="ml-1.5 text-muted-foreground">{codes.join(" ")}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {lists.unattestedModules.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Served to nobody: {lists.unattestedModules.join(", ")}
            </span>
            <span className="text-xs text-muted-foreground">
              These modules have no live attestation in any country. Customers on the mobile
              app cannot see them — including customers who could see them yesterday, if an
              attestation has expired.
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Any country your store listing targets that is not in these lists is either a licence
        you have not recorded or a market you are not licensed in. There is no third
        possibility — narrow the targeting first, then work out which it was.
      </p>
    </div>
  );
}
