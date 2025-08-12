"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useCampaignStore } from "./store";
import { AddTargetsDialog } from "./add-targets";
import { TargetCard } from "./target";
import { useTranslations } from "next-intl";

export function CampaignTargets() {
  const t = useTranslations("ext");
  const {
    items,
    statusFilter,
    setStatusFilter,
    targetPagination,
    setTargetPagination,
  } = useCampaignStore();

  // Filter & paginate
  const filteredItems = items.filter((item) =>
    statusFilter === "All" ? true : item.status === statusFilter
  );
  const totalTargetPages = Math.ceil(
    filteredItems.length / targetPagination.perPage
  );
  const paginatedItems = filteredItems.slice(
    (targetPagination.currentPage - 1) * targetPagination.perPage,
    targetPagination.currentPage * targetPagination.perPage
  );

  const handlePageChange = (newPage: number) => {
    setTargetPagination({ ...targetPagination, currentPage: newPage });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Targets")}{" "}
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              (
              {items.length}
              )
            </span>
          </CardTitle>
          <CardDescription>
            {t("manage_who_receives_your_campaign_emails")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-full max-w-sm">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  handlePageChange(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t("All")}</SelectItem>
                  <SelectItem value="PENDING">{t("Pending")}</SelectItem>
                  <SelectItem value="ACTIVE">{t("Active")}</SelectItem>
                  <SelectItem value="PAUSED">{t("Paused")}</SelectItem>
                  <SelectItem value="COMPLETED">{t("Completed")}</SelectItem>
                  <SelectItem value="CANCELLED">{t("Canceled")}</SelectItem>
                  <SelectItem value="STOPPED">{t("Stopped")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <AddTargetsDialog />
          </div>
        </CardContent>
      </Card>

      {paginatedItems.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedItems.map((item) => (
            <TargetCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="mt-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("no_targets_added_yet")}. {t("Click")}
          <strong>{t("add_targets")}</strong>
          {t("to_select_users")}.
        </div>
      )}

      {filteredItems.length > targetPagination.perPage && (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={targetPagination.currentPage <= 1}
              onClick={() => handlePageChange(targetPagination.currentPage - 1)}
            >
              <Icon icon="lucide:chevron-left" className="mr-1 h-4 w-4" />
              {t("Prev")}
            </Button>

            {Array.from({ length: totalTargetPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <Button
                  key={pageNum}
                  variant={
                    pageNum === targetPagination.currentPage
                      ? "soft"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={targetPagination.currentPage >= totalTargetPages}
              onClick={() => handlePageChange(targetPagination.currentPage + 1)}
            >
              {t("Next")}
              <Icon icon="lucide:chevron-right" className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
