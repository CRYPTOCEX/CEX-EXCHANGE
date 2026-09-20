"use client";

import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";
import {
  PRODUCT_BY_NAME,
  productDetailHref,
} from "@/app/[locale]/(dashboard)/admin/components/product-catalog";

/**
 * The one block on this console that knows the AI Support add-on exists.
 *
 * ---------------------------------------------------------------------------
 * TWO STATES, ONE SLOT
 * ---------------------------------------------------------------------------
 * The desk console is deliberately free of AI: no drafts, no confidence bars, no
 * "suggest a reply". An operator without the add-on should never meet a control
 * that 403s, and an operator WITH it should not have to remember that a second,
 * better inbox exists somewhere in the navigation.
 *
 * So this is one slot in the queue pane with two states:
 *
 *   installed      → a door to `/admin/ai/support/inbox`, the takeover console,
 *                    where the same tickets carry the assistant's reasoning.
 *   not installed  → what the add-on is, and the extension page that sells it.
 *
 * ---------------------------------------------------------------------------
 * "INSTALLED" MEANS THE PLATFORM SAYS SO
 * ---------------------------------------------------------------------------
 * `useConfigStore().extensions` is `CacheManager.getExtensions()` on the wire,
 * and that loader selects `where: { status: true }` — so the list is *enabled*
 * extensions, not merely present files. That is the right test: a disabled
 * add-on has no inbox to send anyone to, and its routes would 403 at the gate.
 *
 * The `name` comes from `PRODUCT_BY_NAME` rather than a literal, because that
 * map is the one place the extension name, the Envato id and the pitch are
 * written down — a hardcoded `"ai_support"` here is exactly how the old
 * dashboard ended up with fifteen upsells pointing at dead routes.
 */
export const AI_SUPPORT_EXTENSION = "ai_support";

/** True when the AI Support add-on is installed AND enabled on this platform. */
export function useHasAiSupport(): boolean {
  const extensions = useConfigStore((state) => state.extensions);
  return Array.isArray(extensions) && extensions.includes(AI_SUPPORT_EXTENSION);
}

export function AiSupportBridge({ className }: { className?: string }) {
  const t = useTranslations("dashboard_admin");
  const installed = useHasAiSupport();
  const hasPermission = useUserStore((state) => state.hasPermission);
  const product = PRODUCT_BY_NAME.get(AI_SUPPORT_EXTENSION);

  if (installed) {
    return (
      <Link
        href="/admin/ai/support/inbox"
        className={cn(
          "group border-border bg-card hover:border-primary/40 hover:bg-primary/[0.04] block rounded-lg border p-2.5 transition-colors",
          className
        )}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium">
          <span className="bg-primary/10 grid size-5 shrink-0 place-items-center rounded-md">
            <Bot className="text-primary size-3" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">{t("ai_live_inbox")}</span>
          <ArrowRight
            className="text-muted-foreground group-hover:text-primary size-3 shrink-0 transition-colors rtl:rotate-180"
            aria-hidden
          />
        </p>
        <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">
          {t("ai_live_inbox_help")}
        </p>
      </Link>
    );
  }

  /*
   * The extension manager is where this leads, so a role that cannot open it
   * gets nothing rather than a dead end. Desk agents work this console all day
   * and are not the people who buy add-ons; showing them a locked door on every
   * shift is noise they cannot act on.
   */
  if (!product || !hasPermission("access.extension")) return null;

  return (
    <Link
      href={productDetailHref(product.productId)}
      className={cn(
        "group border-border-strong hover:bg-surface-2 block rounded-lg border border-dashed p-2.5 transition-colors",
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium">
        <span className="bg-surface-3 grid size-5 shrink-0 place-items-center rounded-md">
          <Sparkles className="text-subtle-foreground size-3" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">{product.label}</span>
        <span className="text-subtle-foreground shrink-0 font-mono text-[9px] tracking-wider uppercase">
          {t("add_on")}
        </span>
      </p>
      {/* The product's own one-liner, from the catalogue. Not re-written here:
          two descriptions of the same add-on drift, and this one is the same
          sentence the dashboard's growth panel and the extension page show. */}
      <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">
        {product.pitch}
      </p>
      <p className="text-primary mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium underline-offset-2 group-hover:underline">
        {t("see_what_it_does")}
        <ArrowRight className="size-2.5 rtl:rotate-180" aria-hidden />
      </p>
    </Link>
  );
}
