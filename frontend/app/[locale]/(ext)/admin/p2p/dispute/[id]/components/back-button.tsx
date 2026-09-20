"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function BackButton() {
  const t = useTranslations("ext_admin");
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push("/admin/p2p/dispute")}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {t("back_to_disputes")}
    </Button>
  );
}
