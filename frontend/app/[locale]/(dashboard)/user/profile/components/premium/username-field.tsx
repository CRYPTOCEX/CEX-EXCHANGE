"use client";

/**
 * THE USERNAME FIELD.
 *
 * WHAT IT IS FOR
 * --------------
 * Everything this platform shows one user about another was built from
 * `firstName + lastName` — the name on the identity document uploaded for KYC.
 * On the P2P market that sat beside a trader's live offers, their payment
 * rails and their volume, on a page that does not require an account to read.
 * A handle is the whole fix, and this is where somebody sets one.
 *
 * WHY IT CHECKS WHILE YOU TYPE
 * ----------------------------
 * A handle is unique, so most of the good ones are taken — and a field that
 * only tells you that when you press Save makes somebody guess, save, fail,
 * guess again. The check runs against the same function the save runs
 * (`utils/username.ts`), so "available" here and "saved" there cannot disagree,
 * and a taken handle comes back with alternatives that have themselves been
 * checked.
 *
 * DEBOUNCED, AND THE LAST ANSWER WINS. Typing `gregmint` fires no request per
 * keystroke; and a slow response for `greg` must never overwrite the verdict
 * for `gregmint` — the request counter is what stops the field settling on an
 * answer to a question the person has already moved past.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AtSign, Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";

const MIN = 3;
const MAX = 32;
/** Mirrors `USERNAME_PATTERN` in `backend/src/utils/username.ts`. */
const SHAPE = /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/;

type Verdict =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok" }
  | { state: "bad"; message: string; suggestions: string[] };

export function UsernameField({
  value,
  original,
  editing,
  onChange,
  /** Reported upward so Save can be blocked on a handle the server will refuse. */
  onValidityChange,
}: {
  value: string;
  /** What is already saved. Re-typing it must never read as "taken". */
  original: string;
  editing: boolean;
  onChange: (value: string) => void;
  onValidityChange?: (valid: boolean) => void;
}) {
  const [verdict, setVerdict] = useState<Verdict>({ state: "idle" });
  const requestRef = useRef(0);

  const trimmed = value.trim();
  const unchanged = trimmed.toLowerCase() === original.trim().toLowerCase();

  const report = useCallback(
    (next: Verdict) => {
      setVerdict(next);
      onValidityChange?.(next.state !== "bad" && next.state !== "checking");
    },
    [onValidityChange]
  );

  useEffect(() => {
    /* Nothing to check: not editing, unchanged, or cleared. An EMPTY value is
       valid — a handle is voluntary and somebody who set one must be able to go
       back to the "First L." fallback. */
    if (!editing || unchanged || !trimmed) {
      report({ state: "idle" });
      return;
    }

    /* The shape is checked HERE, with no request. It is the same rule the
       server applies, and firing a round trip to be told "start with a letter"
       is slower and no more correct. */
    if (trimmed.length < MIN || trimmed.length > MAX || !SHAPE.test(trimmed)) {
      report({
        state: "bad",
        message:
          trimmed.length < MIN
            ? `At least ${MIN} characters.`
            : trimmed.length > MAX
              ? `At most ${MAX} characters.`
              : "Letters, numbers and single underscores. Start with a letter.",
        suggestions: [],
      });
      return;
    }

    report({ state: "checking" });
    const ticket = ++requestRef.current;
    const timer = setTimeout(async () => {
      const { data, error } = await $fetch({
        url: `/api/user/profile/username?username=${encodeURIComponent(trimmed)}`,
        silent: true,
      });
      // A late answer to a question the person has moved past must not land.
      if (ticket !== requestRef.current) return;

      if (error || !data) {
        // Unknown, not invalid: the save still checks, and refusing here would
        // block somebody out of a handle over a network blip.
        report({ state: "idle" });
        return;
      }
      const payload = data as any;
      if (payload.available) {
        report({ state: "ok" });
      } else {
        report({
          state: "bad",
          message: payload.message || "That username can't be used.",
          suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [trimmed, unchanged, editing, report]);

  return (
    <div className="space-y-2 md:col-span-2">
      <Label className="flex items-center gap-2 text-sm text-muted-foreground">
        <AtSign className="h-4 w-4" />
        Username
      </Label>

      <div className="relative">
        {/* The sigil is drawn, not stored. `@` is how a handle READS; putting
            it in the value would make it part of the handle. */}
        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground">
          @
        </span>
        <Input
          value={value}
          onChange={(event) =>
            // Filtered at the keystroke: a space or a dot can never be part of
            // a handle, so silently refusing them beats explaining them.
            onChange(event.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, MAX))
          }
          disabled={!editing}
          placeholder="gregmint"
          aria-invalid={verdict.state === "bad" ? true : undefined}
          className={cn(
            "bg-muted/50 border-border-strong text-foreground ps-8",
            "focus:border-warning/50 focus:ring-warning/20",
            !editing && "opacity-60 cursor-not-allowed",
            verdict.state === "bad" && "border-destructive/60"
          )}
        />
        {editing && trimmed && !unchanged && (
          <span className="absolute inset-y-0 end-0 flex items-center pe-3">
            {verdict.state === "checking" && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            {verdict.state === "ok" && (
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
            )}
            {verdict.state === "bad" && (
              <X className="h-4 w-4 text-destructive" aria-hidden="true" />
            )}
          </span>
        )}
      </div>

      {verdict.state === "bad" ? (
        <div className="space-y-1.5">
          <p className="text-xs text-destructive-ink">{verdict.message}</p>
          {verdict.suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-subtle-foreground">Available:</span>
              {verdict.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onChange(suggestion)}
                  className="rounded-sm bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : verdict.state === "ok" ? (
        <p className="text-xs text-success-ink">@{trimmed} is available.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          This is what other people see — on the P2P market, on posts, and in trades. Your real
          name is never shown to them.{" "}
          {original ? "Clear it to go back to your first name and initial." : ""}
        </p>
      )}
    </div>
  );
}
