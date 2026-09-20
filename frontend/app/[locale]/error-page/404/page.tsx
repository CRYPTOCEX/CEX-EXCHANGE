"use client";
import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

const ErrorPage = () => {
  const t = useTranslations("common");
  return (
    <ErrorShell
      code="404"
      title={t("ops_page_not_found")}
      description={[
        t("the_page_you_removed_had"),
        t("its_name_changed_or_is_temporarily_unavailable"),
      ]}
    />
  );
};

export default ErrorPage;
