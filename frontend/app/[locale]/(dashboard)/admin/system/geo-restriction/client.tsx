"use client";

import React, { useCallback, useEffect, useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Globe2,
  ScrollText,
  Settings2,
  ShieldBan,
  TestTube2,
} from "lucide-react";
import { m } from "framer-motion";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { RuleTester } from "./rule-tester";

interface PolicySummary {
  enabled: boolean;
  mode: "BLOCKLIST" | "ALLOWLIST";
  activeRules: number;
  blockRules: number;
  allowRules: number;
}

/**
 * A rule list is meaningless without the master switch it hangs off. This
 * banner answers the first question an operator has on landing here — "is any
 * of this actually being applied right now?" — before they read a single row.
 */
function PolicyBanner({ summary }: { summary: PolicySummary | null }) {
  const t = useTranslations("dashboard_admin");
  if (!summary) return null;

  const dangerouslyInert = !summary.enabled && summary.activeRules > 0;
  const emptyAllowlist = summary.enabled && summary.mode === "ALLOWLIST" && summary.allowRules === 0;

  return (
    <m.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
          emptyAllowlist
            ? "border-destructive/30 bg-destructive/10"
            : dangerouslyInert
              ? "border-warning/30 bg-warning/10"
              : summary.enabled
                ? "border-success/30 bg-success/10"
                : "border-border bg-muted/40"
        }`}
      >
        {summary.enabled ? (
          <ShieldBan className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <span className="text-sm font-medium">
          {summary.enabled
            ? `Enforcement is ON — ${summary.mode === "ALLOWLIST" ? "allowlist" : "blocklist"} mode`
            : t("enforcement_is_off")}
        </span>

        <Badge variant="secondary" className="text-xs">
          {summary.blockRules} restricted
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {summary.allowRules} permitted
        </Badge>

        {emptyAllowlist && (
          <span className="text-sm text-destructive">
            {t("allowlist_mode_with_no_permitted_countries")}
          </span>
        )}
        {dangerouslyInert && (
          <span className="text-sm text-warning">
            {t("these_rules_are_saved_but_not_being_applied")}
          </span>
        )}

        <Button asChild size="sm" variant="outline" className="ml-auto gap-2">
          <Link href="/admin/system/geo-restriction/settings">
            <Settings2 className="h-3.5 w-3.5" />
            Policy
          </Link>
        </Button>
      </div>
    </m.div>
  );
}

export default function GeoRestrictionClient() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  const [summary, setSummary] = useState<PolicySummary | null>(null);
  const [testerOpen, setTesterOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    const { data, error } = await $fetch<{ summary: PolicySummary }>({
      url: "/api/admin/system/geo-restriction/settings",
      silent: true,
    });
    // $fetch resolves with {data, error} rather than throwing, so a failed
    // read has to be handled here — otherwise the banner would silently claim
    // enforcement is off when it simply could not be read.
    if (!error && data?.summary) setSummary(data.summary);
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <>
      <DataTable
        apiEndpoint="/api/admin/system/geo-restriction"
        model="geoRestriction"
        permissions={{
          access: "access.geo.restriction",
          view: "view.geo.restriction",
          create: "create.geo.restriction",
          edit: "edit.geo.restriction",
          delete: "delete.geo.restriction",
        }}
        pageSize={20}
        canCreate
        canEdit
        canDelete
        canView
        isParanoid={true}
        title={t("geographic_restrictions")}
        description={t(
          "control_which_countries_can_access_the_platform_and_record_why"
        )}
        itemTitle="Country Restriction"
        columns={columns}
        formConfig={formConfig}
        viewConfig={viewConfig}
        analytics={analytics}
        extraTopButtons={(refresh) => (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setTesterOpen(true)}
            >
              <TestTube2 className="h-3.5 w-3.5" />
              {t("test_a_rule")}
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link href="/admin/system/geo-restriction/log">
                <ScrollText className="h-3.5 w-3.5" />
                {t("access_log")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link href="/admin/system/geo-restriction/settings">
                <Settings2 className="h-3.5 w-3.5" />
                Policy
              </Link>
            </Button>
          </div>
        )}
        // Rendered by the table itself so the banner sits *below* the heading,
        // inside the same container as the rows, instead of floating above the
        // hero in its own width.
        alertContent={<PolicyBanner summary={summary} />}
        design={{
          icon: Globe2,
        }}
      />

      <RuleTester
        open={testerOpen}
        onOpenChange={(open) => {
          setTesterOpen(open);
          // A rule may have been created between opening and closing the
          // dialog; refresh the banner so its counts stay honest.
          if (!open) void loadSummary();
        }}
      />
    </>
  );
}
