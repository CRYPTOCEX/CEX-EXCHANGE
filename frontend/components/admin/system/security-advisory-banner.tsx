"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Security advisories, in front of the person who can act on them.
 *
 * ===========================================================================
 * THIS IS A NOTIFICATION OBLIGATION, NOT A CONVENIENCE
 * ===========================================================================
 * From 11 September 2026, Article 14 of the Cyber Resilience Act requires the
 * manufacturer to inform affected users without undue delay when an actively
 * exploited vulnerability or a severe incident affects the software. For
 * installations in the field, THIS COMPONENT IS HOW THAT HAPPENS — the publisher
 * writes an advisory, pushes it, and it appears here within a minute.
 *
 * Three consequences for how it behaves, each of which looks like
 * over-engineering until you consider the failure it prevents:
 *
 * 1. IT RENDERS ON EVERY ADMIN PAGE, not on the update screen. An operator who
 *    never opens System → Update is exactly the operator running an unpatched
 *    build. A notice nobody navigates to has not notified anybody.
 *
 * 2. A CRITICAL ADVISORY CANNOT BE DISMISSED. Everything else can, and the
 *    dismissal is remembered per advisory id. Making the most serious class
 *    permanently hideable in one click would defeat the entire mechanism, and
 *    "I clicked it away months ago" is not a defence anyone wants to make.
 *
 * 3. IT ASKS ABOUT THE VERSIONS ACTUALLY INSTALLED. The backend route sends the
 *    running core and add-on versions, so an operator only sees what applies to
 *    them. An advisory shown to installs it does not affect is the fastest way
 *    to train people to ignore the next one.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT DO, DELIBERATELY
 * ---------------------------------------------------------------------------
 * When the advisory service is unreachable this renders NOTHING rather than a
 * warning. That is a real trade-off and it is not obviously right: silence
 * after a failed check is indistinguishable from silence after a clean one.
 *
 * It is drawn this way because a transient docs outage would otherwise paint an
 * unexplained red bar across every admin page of every installation in the
 * world, and a banner that cries wolf is a banner people learn to close. The
 * check result is returned as `reachable: false` with a message so that
 * System → Update — where somebody is deliberately looking — can report that
 * the last check failed. Do not "fix" this by making the banner shout.
 */

interface Advisory {
  id: string;
  productName: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  published: string;
  affected: string;
  fixed: string | null;
  summary: string;
  cve: string | null;
  url: string;
}

const DISMISSED_KEY = "security-advisories-dismissed";

/** Critical is deliberately absent — see the note above. */
const DISMISSIBLE = new Set(["high", "medium", "low"]);

function loadDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function SecurityAdvisoryBanner() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Read localStorage after mount, never during render: the server has no
  // localStorage, so reading it in the initial state would make the first
  // client paint disagree with the server's and hydration would tear.
  useEffect(() => setDismissed(loadDismissed()), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/system/security-advisories");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.advisories)) {
          setAdvisories(data.advisories);
        }
      } catch {
        // Silent by design — see the file note.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = advisories.filter(
    (a) => a.severity === "critical" || !dismissed.includes(a.id),
  );

  if (!visible.length) return null;

  const dismiss = (id: string) => {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // A full or disabled localStorage costs us the memory of the dismissal,
      // not the dismissal itself. The banner reappears next load, which is the
      // safe direction to fail.
    }
  };

  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-6">
      {visible.map((a) => {
        const critical = a.severity === "critical";
        return (
          <div
            key={a.id}
            role="alert"
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
              critical
                ? "border-destructive bg-destructive/10 text-destructive-ink"
                : "border-warning/20 bg-warning/10 text-warning-ink",
            )}
          >
            {critical ? (
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                <span className="uppercase tracking-wide text-xs">
                  {a.severity} security advisory
                </span>
                <span className="opacity-60">·</span>
                <span>{a.productName}</span>
                {a.cve ? (
                  <>
                    <span className="opacity-60">·</span>
                    <span className="font-mono text-xs">{a.cve}</span>
                  </>
                ) : null}
              </div>

              <p className="font-medium">{a.title}</p>
              <p className="opacity-90">{a.summary}</p>

              <p className="text-xs opacity-80">
                Affects {a.affected}.{" "}
                {a.fixed ? (
                  <>
                    Fixed in <strong>{a.fixed}</strong> — update from{" "}
                    <Link href="/admin/system/update" className="underline underline-offset-2">
                      System → Update
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    No fix is available yet.{" "}
                    <a
                      href={`https://mashdiv.com${a.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      Read the mitigation
                    </a>
                    .
                  </>
                )}
              </p>
            </div>

            {DISMISSIBLE.has(a.severity) ? (
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                aria-label={`Dismiss advisory ${a.id}`}
                className="shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
