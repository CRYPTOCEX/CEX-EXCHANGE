"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";

/**
 * "Ask the AI about this customer" — the admin-side rail.
 *
 * Renders NOTHING unless the AI Support addon is installed, switched on, and
 * account tools are enabled. Those are three separate operator decisions and
 * the last one matters most: docs-only mode exists so that no customer account
 * data leaves the install, and a rail that appeared anyway — even greyed out —
 * would advertise a capability the operator has deliberately turned off.
 *
 * The answer is deliberately NOT rendered as markdown. It is read by staff
 * making a decision about someone's money, and the raw text is what the model
 * actually said; a renderer that swallows an unclosed backtick or reflows a
 * quoted amount is a bad trade in that context.
 */
export function AskAboutUser({ userId }: { userId: string }) {
  const t = useTranslations("ext_admin_ai_support");
  const { settings, extensions } = useSettings();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Settings are TEXT on this platform: the string "false" is truthy under
  // Boolean(), so each of these needs the explicit comparison.
  const enabled = String(settings?.aiSupportEnabled) === "true";
  const toolsOn = String(settings?.aiSupportAccountToolsEnabled) === "true";
  const installed = Boolean(
    (extensions as any)?.includes?.("ai_support") ??
      (extensions as any)?.ai_support
  );

  if (!installed || !enabled || !toolsOn) return null;

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    setAnswer(null);

    const { data, error: failed } = await $fetch<{ answer: string }>({
      url: "/api/admin/ai/support/ask",
      method: "POST",
      body: { userId, question: trimmed },
      silent: true,
    });
    setBusy(false);

    if (failed) {
      setError(String(failed));
      return;
    }
    setAnswer(data?.answer || null);
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          {t("ask_about_customer")}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("ask_about_customer_help")}
        </p>

        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask();
              }
            }}
            rows={2}
            placeholder={t("ask_about_customer_placeholder")}
            className="min-h-16 flex-1 resize-none rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button type="submit" size="icon" disabled={!question.trim() || busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive-ink">
            {error}
          </p>
        ) : null}

        {answer ? (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{answer}</p>
            <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
              {/* Stated every time, not once in a tooltip. This reads account
                  rows and documentation; it does not know anything the operator
                  has not written down, and an agent about to act on it needs
                  that in front of them. */}
              {t("ask_about_customer_disclaimer")}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
