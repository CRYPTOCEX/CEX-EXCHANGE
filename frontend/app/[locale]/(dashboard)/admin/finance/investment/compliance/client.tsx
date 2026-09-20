"use client";

/**
 * THE TERRITORY GATE ON FIXED-RETURN INVESTMENTS.
 *
 * ---------------------------------------------------------------------------
 * THE ONE THING THIS SCREEN MUST NOT DO
 * ---------------------------------------------------------------------------
 * Show the operator their own saved list and let them believe it is what the
 * gate is using.
 *
 * Removing a default territory does not take effect until a Super Admin has
 * accepted the risk statement — that is what stops the acceptance being a
 * checkbox that gates nothing. So the two lists are ALWAYS rendered separately:
 * what was saved, and what is enforced right now. When they differ the screen
 * says which territories are still blocked and why, in words, above the field.
 *
 * A compliance console whose display is one refresh out of step with the door
 * is worse than no console, so every mutation re-reads from the server rather
 * than patching local state.
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import {
  AlertTriangle,
  Check,
  Globe,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

import { PageShell, PageHeader } from "@/components/layout/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Acknowledgement {
  userId: string;
  email: string | null;
  acceptedAt: string;
  statementVersion: string;
  statement: string;
}

interface ComplianceState {
  configuredBlockList: string[];
  effectiveBlockList: string[];
  defaultBlockList: string[];
  pendingUnblocks: string[];
  acknowledged: boolean;
  acknowledgement: Acknowledgement | null;
  statement: string;
  statementVersion: string;
  canAcknowledge: boolean;
}

export default function InvestmentComplianceClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const [state, setState] = useState<ComplianceState | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await $fetch({
      url: "/api/admin/finance/investment/compliance",
      silentSuccess: true,
    });
    setLoading(false);
    if (error || !data) return;
    setState(data as ComplianceState);
    setDraft((data as ComplianceState).configuredBlockList.join(", "));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Every write goes through here and every write re-reads.
   *
   * The server decides what the effective list becomes — an unacknowledged
   * removal is stored and not enforced — so there is no local computation that
   * could agree with the field and disagree with the door.
   */
  const save = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      const { error } = await $fetch({
        url: "/api/admin/finance/investment/compliance",
        method: "PUT",
        body,
      });
      setSaving(false);
      if (!error) await load();
    },
    [load]
  );

  if (loading && !state) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!state) {
    return (
      <PageShell>
        <PageHeader
          title={t("investment_compliance")}
          description={t("investment_compliance_description")}
        />
        <p className="mt-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-ink">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {tCommon("something_went_wrong")}
        </p>
      </PageShell>
    );
  }

  const ack = state.acknowledgement;
  const staleAcceptance =
    !!ack && !state.acknowledged && ack.statementVersion !== state.statementVersion;

  return (
    <PageShell>
      <PageHeader
        title={t("investment_compliance")}
        description={t("investment_compliance_description")}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------------------- */}
        {/* The list                                                       */}
        {/* ------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
              {t("territory_gate")}
            </CardTitle>
            <CardDescription>{t("blocked_territories_help")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/*
              THE DIFFERENCE, STATED BEFORE THE FIELD.
              Above the input rather than below it, because the operator is
              about to read the field and believe it.
            */}
            {state.pendingUnblocks.length > 0 && (
              <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning-ink">
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold">
                    {t("not_taking_effect")}:
                  </strong>{" "}
                  {state.pendingUnblocks.join(", ")}. {t("pending_unblock_warning")}
                </span>
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="block-list">{t("blocked_territories")}</Label>
              <Input
                id="block-list"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="US, GB, DE"
                spellCheck={false}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-subtle-foreground">
                {t("enforced_now")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {state.effectiveBlockList.length === 0 ? (
                  <Badge variant="outline">{tCommon("no_grouping")}</Badge>
                ) : (
                  state.effectiveBlockList.map((code) => (
                    <Badge key={code} variant="secondary">
                      {code}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                loading={saving}
                onClick={() =>
                  save({
                    blockList: draft
                      .split(/[,;\s]+/)
                      .map((c) => c.trim())
                      .filter(Boolean),
                  })
                }
              >
                <Save className="size-4" aria-hidden="true" />
                {tCommon("save")}
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setDraft(state.defaultBlockList.join(", "))}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {t("restore_defaults")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* The acceptance                                                 */}
        {/* ------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {state.acknowledged ? (
                <ShieldCheck
                  className="size-4 text-success-ink"
                  aria-hidden="true"
                />
              ) : (
                <ShieldOff
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              {t("risk_statement")}
            </CardTitle>
            <CardDescription>
              {state.acknowledged ? (
                <span className="flex flex-wrap items-center gap-x-1.5">
                  <Check className="size-3.5 text-success-ink" aria-hidden="true" />
                  {tCommon("accepted_by")} <strong>{ack?.email ?? ack?.userId}</strong>
                  {" · "}
                  {t("accepted_on")}{" "}
                  {ack ? new Date(ack.acceptedAt).toLocaleString() : ""}
                </span>
              ) : (
                t("not_accepted")
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/*
              A REVISED STATEMENT INVALIDATES THE OLD ACCEPTANCE, and the
              operator is told so rather than discovering it as a silently
              restored block list. Nobody may be held to have accepted words
              that did not exist when they clicked.
            */}
            {staleAcceptance && (
              <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning-ink">
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{t("statement_revised_notice")}</span>
              </p>
            )}

            {/* The words themselves. Rendered from the server's copy, so the
                screen cannot show a statement other than the one that would be
                recorded. `whitespace-pre-line` keeps its paragraphing. */}
            <p className="whitespace-pre-line rounded-md border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
              {state.statement}
            </p>

            <Separator />

            {!state.canAcknowledge ? (
              <p className="text-xs text-subtle-foreground">
                {t("acceptance_requires_super_admin")}
              </p>
            ) : state.acknowledged ? (
              <Button
                variant="outline"
                loading={saving}
                onClick={() => save({ revokeAcknowledgement: true })}
              >
                <ShieldOff className="size-4" aria-hidden="true" />
                {t("withdraw_acceptance")}
              </Button>
            ) : (
              <Button
                loading={saving}
                onClick={() => save({ acknowledgeRiskStatement: true })}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                {t("accept_risk_statement")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
