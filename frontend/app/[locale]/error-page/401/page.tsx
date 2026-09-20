"use client";
import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

const ErrorPage = () => {
  const t = useTranslations("common");
  return (
    <ErrorShell
      code="401"
      title={t("you_are_not_authorized")}
      description={[
        t("you_dont_have_this_page"),
        t("please_contact_your_access_rights"),
      ]}
    />
  );
};

export default ErrorPage;
