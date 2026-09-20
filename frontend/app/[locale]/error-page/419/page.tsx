"use client";
import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

const ErrorPage = () => {
  const t = useTranslations("common");
  return (
    <ErrorShell
      code="419"
      title={t("ops_page_expired_error")}
      description={[
        t("your_session_has_please_login"),
        t("again_to_continue"),
      ]}
    />
  );
};

export default ErrorPage;
