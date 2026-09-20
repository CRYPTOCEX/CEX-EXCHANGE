"use client";
import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

const ErrorPage = () => {
  const t = useTranslations("common");
  return (
    <ErrorShell
      code="429"
      title={t("ops_too_many_request_error")}
      description={[
        t("you_have_made_please_wait"),
        t("and_try_again_later"),
      ]}
    />
  );
};

export default ErrorPage;
