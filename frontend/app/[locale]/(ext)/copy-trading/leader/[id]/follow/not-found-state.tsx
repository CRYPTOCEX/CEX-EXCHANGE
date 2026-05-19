"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function FollowLeaderNotFoundState() {
  const t = useTranslations("ext");
  const tExtCopyTrading = useTranslations("ext_copy-trading");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-20">
      <h2 className="text-2xl font-bold mb-4">{t("leader_not_found")}</h2>
      <Link href="/copy-trading/leader">
        <Button>{tExtCopyTrading("back_to_leaders")}</Button>
      </Link>
    </div>
  );
}
