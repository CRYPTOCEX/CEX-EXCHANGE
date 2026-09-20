"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type CopyState = "idle" | "copied" | "failed";

/**
 * Copy to clipboard, including on the origins where the modern API is absent.
 *
 * `navigator.clipboard` is gated on a SECURE CONTEXT. A self-hosted install
 * reached over plain http on a LAN address — which is how most of these get
 * configured before a certificate exists — has no `navigator.clipboard` at all,
 * so the usual `try { await writeText() } catch {}` idiom does nothing and
 * silently reports nothing. That matters more here than almost anywhere else in
 * the product: the whole point of this page is moving a webhook URL into a
 * vendor's dashboard, and "the copy button does nothing" is the failure.
 *
 * So there are three tiers: the real API, a `execCommand` fallback through a
 * detached textarea, and — if both fail — an explicit failed state, because a
 * button that lies about having copied is worse than one that admits it did
 * not.
 */
export function useCopy(): [CopyState, (value: string) => void] {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const settle = useCallback((next: CopyState) => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }, []);

  const copy = useCallback(
    (value: string) => {
      const legacy = () => {
        try {
          const area = document.createElement("textarea");
          area.value = value;
          // Off-screen rather than display:none — a hidden element cannot be
          // selected, and execCommand copies the SELECTION.
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.top = "-1000px";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(area);
          settle(ok ? "copied" : "failed");
        } catch {
          settle("failed");
        }
      };

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).then(() => settle("copied"), legacy);
        return;
      }
      legacy();
    },
    [settle]
  );

  return [state, copy];
}

export function CopyButton({
  value,
  label,
  size = "sm",
  variant = "outline",
  className,
}: {
  value: string;
  label?: string;
  size?: "2xs" | "xs" | "sm" | "default";
  variant?: "outline" | "ghost" | "soft";
  className?: string;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const [state, copy] = useCopy();

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("shrink-0", className)}
      onClick={() => copy(value)}
      aria-label={label ? undefined : tDashboard("copy_to_clipboard")}
    >
      {state === "copied" ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : state === "failed" ? (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {label && (
        <span>
          {state === "copied"
            ? tCommon("copied")
            : state === "failed"
              ? t("press_ctrl_c")
              : label}
        </span>
      )}
    </Button>
  );
}

/**
 * A value the operator has to move somewhere else — a webhook URL, a return
 * URL, a variable name.
 *
 * The value is selectable text in a `<code>`, not an input: an input invites
 * editing something that is derived and cannot be edited here, and on a narrow
 * viewport it truncates the middle of a URL, which is the part that differs.
 */
export function CopyableValue({
  value,
  label,
  hint,
  className,
}: {
  value: string;
  label?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-surface-3 px-2.5 py-1.5 font-mono text-xs whitespace-nowrap">
          {value}
        </code>
        <CopyButton value={value} />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
