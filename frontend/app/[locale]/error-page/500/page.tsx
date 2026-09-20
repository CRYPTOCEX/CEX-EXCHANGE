"use client";
import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

const ErrorPage = () => {
  const t = useTranslations("common");
  return (
    // 500 is one of the two codes that mean the platform failed, not the
    // request — so the mark carries genuine state (DESIGN-SYSTEM.md R2).
    <ErrorShell
      code="500"
      tone="destructive"
      title={t("ops_internal_server_error")}
      description={[
        t("something_went_wrong_our_end"),
        t("please_try_again_the_issue"),
      ]}
    />
  );
};

export default ErrorPage;
