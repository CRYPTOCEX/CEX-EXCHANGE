"use client";
import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

const ErrorPage = () => {
  const t = useTranslations("common");
  return (
    // Maintenance / capacity: the service is down on our side, so this is the
    // second genuine-failure state rather than a decorative accent.
    <ErrorShell
      code="503"
      tone="destructive"
      title={t("ops_service_unavailable_error")}
      description={[
        t("our_service_is_back_soon"),
        t("please_check_back_for_updates"),
      ]}
    />
  );
};

export default ErrorPage;
