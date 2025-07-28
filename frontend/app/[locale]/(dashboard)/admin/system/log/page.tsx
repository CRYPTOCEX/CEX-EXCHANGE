"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { $fetch } from "@/lib/api";
import { useTableStore } from "@/components/blocks/data-table/store";
import { useTranslations } from "next-intl";
// adjust path if needed
export default function LogPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/system/log"
      model="log"
      permissions={{
        access: "access.system.log",
        view: "view.system.log",
        create: "create.system.log",
        edit: "edit.system.log",
        delete: "delete.system.log",
      }}
      pageSize={10}
      canDelete={true}
      canView={true}
      isParanoid={false}
      title="System Logs"
      itemTitle="Log Entry"
      columns={columns}
      extraTopButtons={(refresh) => {
        const t = useTranslations("dashboard");
        return (
          <Button
            type="button"
            color="secondary"
            size="sm"
            variant={"soft"}
            onClick={async () => {
              const { error } = await $fetch({
                url: "/api/admin/system/log/clean",
                method: "DELETE",
              });
              if (!error && typeof refresh === "function") {
                refresh();
              }
            }}
          >
            {t("clean_logs")}
          </Button>
        );
      }}
    />
  );
}
