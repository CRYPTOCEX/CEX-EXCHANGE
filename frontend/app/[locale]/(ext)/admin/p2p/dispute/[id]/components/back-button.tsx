"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function BackButton() {
  const t = useTranslations("ext");
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push("/admin/disputes")}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {t("back_to_disputes")}
    </Button>
  );
}
