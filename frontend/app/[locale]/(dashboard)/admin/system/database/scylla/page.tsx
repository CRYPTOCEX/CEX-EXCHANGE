"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/layout/page-shell";
import { useTranslations } from "next-intl";
import { Snapshots } from "./snapshots";
import { Records } from "./records";

export default function ScyllaAdminPage() {
  const t = useTranslations("dashboard_admin");
  const [tab, setTab] = useState("snapshots");

  return (
    <PageShell rhythm="none">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t("scylladb")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("scylladb_page_description")}
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="snapshots">{t("snapshots")}</TabsTrigger>
            <TabsTrigger value="records">{t("records")}</TabsTrigger>
          </TabsList>
          <TabsContent value="snapshots" className="mt-4">
            <Snapshots />
          </TabsContent>
          <TabsContent value="records" className="mt-4">
            <Records />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
