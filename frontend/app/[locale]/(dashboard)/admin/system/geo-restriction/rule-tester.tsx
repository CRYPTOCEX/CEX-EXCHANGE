"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Info, Loader2, ShieldBan, TestTube2 } from "lucide-react";
import { $fetch } from "@/lib/api";
import { GEO_ACTION_OPTIONS } from "./columns";
import { useTranslations } from "next-intl";

interface TestResult {
  allowed: boolean;
  decision: string;
  reasonCode: string;
  message: string;
  action: string | null;
  location: {
    countryCode: string | null;
    countryName: string | null;
    source: string;
    isProxy: boolean | null;
    isTor: boolean | null;
  };
  matchedRules: Array<{
    id: string;
    type: string;
    scope: string;
    restrictedActions: string[];
    reason: string;
    legalReference: string | null;
  }>;
  policyEnabled: boolean;
  mode: string;
  notes: string[];
}

/**
 * Plain-English explanation of each reason code.
 *
 * The code alone ("ACCOUNT_EXIT") tells an operator nothing about why their
 * test came back allowed when they expected a block; this closes that gap
 * without making them read the engine.
 */
const REASON_EXPLANATIONS: Record<string, string> = {
  DISABLED: "Enforcement is switched off, so nothing is being blocked.",
  NO_RULES: "No country rules are in force.",
  EXEMPT_PATH:
    "This path is infrastructure (health checks, the restriction notice, licence recovery) and is never geo-blocked.",
  IP_ALLOWLIST: "The address is on the always-allowed list.",
  ADMIN_BYPASS: "Administrators bypass geographic restrictions.",
  ACCOUNT_EXIT:
    "Blocked country, but this path is part of the wind-down carve-out — existing customers can still sign in, verify and withdraw.",
  COUNTRY_ALLOWED: "This country is not restricted.",
  ACTION_NOT_RESTRICTED:
    "The country has a partial restriction, but this activity is not one of the restricted ones.",
  UNKNOWN_COUNTRY_ALLOWED:
    "The country could not be determined, and the policy allows unknown visitors.",
  LOOKUP_FAILED_OPEN:
    "The geo engine could not be consulted and the policy fails open.",
  COUNTRY_BLOCKED: "The country matches an active restriction rule.",
  NOT_IN_ALLOWLIST:
    "Allowlist mode is on and this country has no permit rule.",
  UNKNOWN_COUNTRY_BLOCKED:
    "The country could not be determined and the policy blocks unknown visitors.",
  IP_BLOCKLIST: "The address is on the always-blocked list.",
  ANONYMIZED_IP:
    "The connection looks like a VPN, proxy or Tor exit and anonymised traffic is blocked.",
  LOOKUP_FAILED_CLOSED:
    "The geo engine could not be consulted and the policy fails closed.",
};

const COMMON_PATHS = [
  { value: "/", label: "Browsing the site" },
  { value: "/api/auth/register", label: "Creating an account" },
  { value: "/api/auth/login", label: "Signing in" },
  { value: "/api/exchange/order", label: "Placing a trade" },
  { value: "/api/finance/deposit/spot", label: "Making a deposit" },
  { value: "/api/finance/withdraw/spot", label: "Making a withdrawal" },
  { value: "/api/user/kyc/application", label: "Submitting verification" },
];

export function RuleTester({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [countryCode, setCountryCode] = useState("");
  const [ip, setIp] = useState("");
  const [path, setPath] = useState("/api/exchange/order");
  const [action, setAction] = useState("");
  const [isProxy, setIsProxy] = useState(false);
  const [isTor, setIsTor] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);

    const { data, error } = await $fetch<TestResult>({
      url: "/api/admin/system/geo-restriction/test",
      method: "POST",
      body: {
        countryCode: countryCode.trim() || undefined,
        ip: ip.trim() || undefined,
        path,
        action: action || undefined,
        isProxy: isProxy || undefined,
        isTor: isTor || undefined,
      },
      silent: true,
    });

    if (!error && data) setResult(data);
    setRunning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5 text-info" />
            {t("test_the_policy")}
          </DialogTitle>
          <DialogDescription>
            {t("runs_the_live_rules_against_a")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="geo-test-country">{t("country_code")}</Label>
              <Input
                id="geo-test-country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                placeholder="US"
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground">
                {t("leave_blank_to_resolve_the_country")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="geo-test-ip">{tCommon("ip_address")}</Label>
              <Input
                id="geo-test-ip"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="203.0.113.4"
              />
              <p className="text-xs text-muted-foreground">
                {t("also_checked_against_your_allow_and_block_lists")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("what_are_they_trying_to_do")}</Label>
              <Select value={path} onValueChange={setPath}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_PATHS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Force an activity (optional)</Label>
              <Select
                value={action || "__auto"}
                onValueChange={(value) =>
                  setAction(value === "__auto" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto">{t("derive_from_the_path")}</SelectItem>
                  {GEO_ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-2">
              <Switch checked={isProxy} onCheckedChange={setIsProxy} />
              <Label className="text-sm font-normal">{t("behind_a_vpn_proxy")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isTor} onCheckedChange={setIsTor} />
              <Label className="text-sm font-normal">{t("tor_exit_node")}</Label>
            </div>
          </div>

          <Button onClick={run} disabled={running} className="w-full gap-2">
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube2 className="h-4 w-4" />
            )}
            {running ? `${t("evaluating")}…` : t("run_the_test")}
          </Button>

          {result && (
            <div
              className={`space-y-3 rounded-xl border p-4 ${
                result.allowed
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.allowed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <ShieldBan className="h-5 w-5 text-destructive" />
                )}
                <span className="font-semibold">
                  {result.allowed ? t("would_be_allowed") : t("would_be_blocked")}
                </span>
                <Badge variant="outline" className="ml-auto font-mono text-xs">
                  {result.reasonCode}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {REASON_EXPLANATIONS[result.reasonCode] || result.message}
              </p>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {tCommon("country")}:{" "}
                  {result.location.countryName ||
                    result.location.countryCode ||
                    "unknown"}
                </Badge>
                <Badge variant="secondary">
                  {t("determined_by")}: {result.location.source}
                </Badge>
                {result.action && (
                  <Badge variant="secondary">{tCommon("activity")}: {result.action}</Badge>
                )}
                <Badge variant="secondary">{tCommon("mode")}: {result.mode}</Badge>
              </div>

              {!result.policyEnabled && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-ink">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Enforcement is currently switched off, so this is what
                    <em> would </em>happen once you enable it.
                  </span>
                </div>
              )}

              {result.matchedRules.length > 0 && (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("rules_in_force_for_this_country")}
                  </p>
                  {result.matchedRules.map((rule) => (
                    <div key={rule.id} className="flex flex-wrap gap-2 text-xs">
                      <Badge
                        variant={
                          rule.type === "ALLOW" ? "success" : "destructive"
                        }
                      >
                        {rule.type === "ALLOW" ? tCommon("permit") : t("restrict")}
                      </Badge>
                      <Badge variant="outline">{rule.scope}</Badge>
                      <Badge variant="outline">{rule.reason}</Badge>
                      {rule.legalReference && (
                        <span className="text-muted-foreground">
                          {rule.legalReference}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.notes?.length > 0 && (
                <div className="space-y-1 border-t pt-3">
                  {result.notes.map((note, index) => (
                    <p
                      key={index}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
