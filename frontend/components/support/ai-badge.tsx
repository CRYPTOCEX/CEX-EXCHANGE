"use client";

import { Sparkles, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * AI disclosure.
 *
 * THIS IS A LEGAL REQUIREMENT, NOT A DESIGN FLOURISH, and it is why nothing
 * here is switchable off — only the disclosure WORDING is editable, in the agent
 * persona.
 *
 *   EU AI Act Art. 50(1) obliges a system intended to interact directly with
 *   natural persons to inform them, clearly and distinguishably, at first
 *   interaction. The "obvious to a reasonably well-informed person" exemption
 *   cannot be relied on for an agent writing in first person under an avatar.
 *
 *   FTC Act §5 treats an undisclosed bot presenting as a human agent as a
 *   deceptive practice, and California SB 1001 requires disclosure for bots used
 *   commercially with California consumers.
 *
 * Each self-hosted operator is the deployer, so the platform ships disclosure on
 * by default.
 *
 * Both mechanisms are required: a PERSISTENT chip on every AI-authored bubble,
 * and a ONE-TIME inline notice on the first AI reply in a thread. The chip is
 * driven off the message's `ai: true` flag, never off a name string — an
 * operator who renames the persona to "Sarah" must not be able to remove the
 * badge by doing so.
 */

export function AiBadge({ className }: { className?: string }) {
  const t = useTranslations("support_ticket");

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex select-none items-center gap-1 rounded-full border border-info/25 bg-info/10 px-1.5 py-px text-[10px] font-medium leading-4 text-info-ink",
              className
            )}
          >
            <Sparkles className="size-2.5" aria-hidden />
            {t("ai_assistant")}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-56 text-xs">
          {t("ai_badge_tooltip")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * The one-time inline notice, shown once per thread above the first AI reply.
 *
 * Centred and system-flavoured so it reads as the interface speaking, not as a
 * message from the assistant — a disclosure delivered in the assistant's own
 * voice is exactly the framing the rules exist to prevent.
 */
export function AiDisclosureNotice({
  text,
  siteName,
  className,
}: {
  text?: string | null;
  siteName?: string;
  className?: string;
}) {
  const t = useTranslations("support_ticket");

  const body =
    text?.trim() ||
    t("ai_disclosure_default", { siteName: siteName || t("this_platform") });

  return (
    <div className={cn("my-3 flex justify-center px-4", className)}>
      <div className="flex max-w-xl items-start gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
        <span className="text-start">{body}</span>
      </div>
    </div>
  );
}

/**
 * The "thinking" indicator.
 *
 * Driven from the `ai.status` websocket frame rather than from a local timer,
 * so it disappears when generation actually ends — including when it ends
 * because a human took the conversation over, which a local timer would leave
 * spinning forever.
 */
export function AiTypingIndicator({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");

  return (
    <div className={cn("flex items-center gap-2 px-1 py-2", className)}>
      <span className="inline-flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-info/70"
            style={{ animationDelay: `${i * 160}ms`, animationDuration: "1.1s" }}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">
        {t("ai_is_typing", { name: name || tCommon("assistant") })}…
      </span>
    </div>
  );
}
