"use client";

import LogoUpload from "@/components/admin/logo-upload";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

export default function LogoManagementPage() {
  const t = useTranslations("dashboard_admin");
  return (
    <PageShell rhythm="none">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("logo_management")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("upload_and_update_logos_for_your_platform")} {t("all_logo_variants_will_be_automatically")}
        </p>
      </div>

      <LogoUpload />
    </PageShell>
  );
} 