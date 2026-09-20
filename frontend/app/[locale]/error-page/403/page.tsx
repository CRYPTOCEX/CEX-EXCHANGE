"use client";
import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

const ErrorPage = () => {
  const t = useTranslations("common");
  return (
    <ErrorShell
      code="403"
      title={t("ops_access_denied")}
      description={[
        t("access_to_this_is_forbidden"),
        t("you_dont_have_this_resource"),
      ]}
    />
  );
};

export default ErrorPage;
