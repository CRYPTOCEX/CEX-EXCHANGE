"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

export function AdminNotesTab() {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin_notes")}</CardTitle>
        <CardDescription>
          {t("internal_notes_about_this_offer")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">
          {t("no_admin_notes_have_been_added_to_this_offer")}
        </p>
        <Textarea
          className="mt-4"
          placeholder="Add a note about this offer..."
        />
        <Button className="mt-2" size="sm">
          {t("add_note")}
        </Button>
      </CardContent>
    </Card>
  );
}
