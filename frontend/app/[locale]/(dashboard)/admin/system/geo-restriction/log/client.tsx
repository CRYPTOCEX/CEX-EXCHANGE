"use client";

import React, { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ScrollText, ShieldBan } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useColumns, useViewConfig } from "./columns";

/**
 * Downloads the CSV export.
 *
 * Deliberately NOT routed through $fetch: that helper parses every response as
 * JSON, which would mangle a CSV body. A direct fetch keeps the bytes intact
 * and lets the browser save them under the filename the server chose.
 */
async function downloadExport(days: number): Promise<void> {
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
  const base =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === "development"
      ? `${window.location.protocol}//${window.location.hostname}:${backendPort}`
      : process.env.NEXT_PUBLIC_SITE_URL || window.location.origin);

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const url = `${base}/api/admin/system/geo-restriction/log/export?from=${encodeURIComponent(from)}`;

  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `geo-access-log_last-${days}-days.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function GeoAccessLogClient() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport(90);
      toast.success(t("export_downloaded"));
    } catch (error: any) {
      toast.error(error?.message || t("export_failed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <DataTable
      apiEndpoint="/api/admin/system/geo-restriction/log"
      model="geoAccessLog"
      permissions={{
        access: "access.geo.restriction.log",
        view: "access.geo.restriction.log",
        create: "access.geo.restriction.log",
        edit: "access.geo.restriction.log",
        delete: "delete.geo.restriction.log",
      }}
      pageSize={25}
      // Read-only by design. This log is evidence: it is written by the
      // enforcement engine and trimmed by the retention job, and nothing in
      // the admin panel may add to it, alter it, or remove single entries.
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView
      isParanoid={false}
      title={t("geographic_access_log")}
      description={t(
        "every_geographic_access_decision_the_platform_has_made_and_why"
      )}
      itemTitle="Access Decision"
      columns={columns}
      viewConfig={viewConfig}
      extraTopButtons={() => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {t("export_last_90_days")}
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link href="/admin/system/geo-restriction">
              <ShieldBan className="h-3.5 w-3.5" />
              {t("country_rules")}
            </Link>
          </Button>
        </div>
      )}
      design={{
        icon: ScrollText,
      }}
    />
  );
}
