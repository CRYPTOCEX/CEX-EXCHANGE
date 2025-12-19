import type { Metadata } from "next";
import LogoUpload from "@/components/admin/logo-upload";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "Logo Management",
  description: "Upload and manage platform logos",
};

export default function LogoManagementPage() {
  const t = useTranslations("dashboard_admin");
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("logo_management")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("upload_and_update_logos_for_your_platform")} {t("all_logo_variants_will_be_automatically")}
        </p>
      </div>
      
      <LogoUpload />
    </div>
  );
} 