import type { Metadata } from "next";
import { AdminLaunchForm } from "@/app/[locale]/(ext)/admin/ico/offer/components/admin-launch-form";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: "Create New Offering | Admin TokenLaunch",
  description: "Create a new token offering on the TokenLaunch platform",
};
export default function CreateOfferingPage() {
  const t = useTranslations("ext");
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("create_new_offering")}
          </h1>
          <p className="text-muted-foreground">
            {t("create_a_new_token_offering_on_the_platform")}
          </p>
        </div>
        <AdminLaunchForm />
      </div>
    </div>
  );
}
