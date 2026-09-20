"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

export default function LeaderNotFoundState() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 bg-linear-to-b from-background to-muted/20 dark:to-surface-2/50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="w-20 h-20 rounded-lg bg-surface-3 flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-foreground">{tExt("leader_not_found")}</h2>
          <p className="text-subtle-foreground mb-6">
            {t("this_leader_profile_doesnt_exist_or")}
          </p>
          <Link href="/copy-trading/leader">
            <Button className="rounded-xl">{t("browse_leaders")}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
