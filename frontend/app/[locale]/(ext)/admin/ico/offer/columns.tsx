"use client";

import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "name",
      title: tExtAdmin("project"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      description: tExtAdmin("ico_project_name_with_token_icon"),
      render: (value: any, row: any) => {
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={row.icon || `/img/placeholder.svg`} />
              <AvatarFallback>{value?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{value}</div>
              <div className="text-sm text-muted-foreground">
                {row.participants} participants
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 2,
      description: tExtAdmin("current_lifecycle_status_of_the_token"),
      options: [
        {
          value: "ACTIVE",
          label: tCommon("active"),
          color: "success",
        },
        {
          value: "SUCCESS",
          label: tExt("success"),
          color: "success",
        },
        {
          value: "FAILED",
          label: tCommon("failed"),
          color: "danger",
        },
        {
          value: "UPCOMING",
          label: tCommon("upcoming"),
          color: "info",
        },
        {
          value: "PENDING",
          label: tCommon("pending"),
          color: "warning",
        },
        {
          value: "REJECTED",
          label: tCommon("rejected"),
          color: "danger",
        },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "ACTIVE":
              case "SUCCESS":
                return "success";
              case "FAILED":
              case "REJECTED":
                return "destructive";
              case "UPCOMING":
                return "warning";
              case "PENDING":
                return "warning";
              default:
                return "default";
            }
          },
        },
      },
    },
    {
      key: "symbol",
      title: tExtAdmin("token"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 3,
      description: tExtAdmin("token_ticker_symbol_e_g_btc_eth_usdt"),
      render: (value: any) => value || "N/A",
    },
    {
      key: "progress",
      title: tCommon("progress"),
      type: "custom",
      priority: 4,
      description: tExtAdmin("fundraising_progress_showing_amount_raised_versus"),
      render: (_: any, row: any) => {
        const progress =
          row.targetAmount > 0
            ? Math.min(
                Math.round((row.currentRaised / row.targetAmount) * 100),
                100
              )
            : 0;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-48">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-medium">{progress}%</span>
                    <span className="text-muted-foreground">
                      ${Number(row.currentRaised).toLocaleString()} $
                      {Number(row.targetAmount).toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className={`h-2 ${progress >= 100 ? "bg-green-500" : progress >= 75 ? "bg-blue-500" : ""}`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 pb-2">
                  <p className="font-medium">{tExt("funding_progress")}</p>
                  <p className="text-xs">{progress}% of target raised</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      key: "targetAmount",
      title: tExtAdmin("target"),
      type: "number",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 5,
      description: tExtAdmin("total_fundraising_target_amount_in_usd"),
      render: (value: any) => `$${Number(value).toLocaleString()}`,
    },
    {
      key: "currentPrice",
      title: tCommon("current_price"),
      type: "number",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_token_price_in_usd_with"),
      render: (value: any, row: any) => {
        if (value != null) {
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                ${Number(value).toLocaleString()}
              </span>
              {row.priceChange != null && (
                <div
                  className={`flex items-center gap-1 text-sm ${row.priceChange >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {row.priceChange >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {row.priceChange >= 0 ? "+" : ""}
                    {row.priceChange}%
                  </span>
                </div>
              )}
            </div>
          );
        }
        return <span className="text-muted-foreground">N/A</span>;
      },
      expandedOnly: true,
    },
    {
      key: "submittedAt",
      title: tExtAdmin("submitted_1"),
      type: "date",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("date_when_the_ico_offering_was"),
      render: (value: any) => {
        if (value) {
          const date = new Date(value);
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {formatDistanceToNow(date, {
                    addSuffix: true,
                  })}
                </TooltipTrigger>
                <TooltipContent>{format(date, "PPP p")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <span className="text-muted-foreground">{tCommon("not_submitted")}</span>;
      },
      expandedOnly: true,
    },
    {
      key: "endDate",
      title: tCommon("end_date"),
      type: "date",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("scheduled_end_date_of_the_token"),
      render: (value: any) => {
        if (value) {
          const date = new Date(value);
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {formatDistanceToNow(date, {
                    addSuffix: true,
                  })}
                </TooltipTrigger>
                <TooltipContent>{format(date, "PPP p")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <span className="text-muted-foreground">{tExtAdmin("no_end_date")}</span>;
      },
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_ico_offer"),
      description: tExtAdmin("set_up_a_new_initial_coin"),
      groups: [
        {
          id: "project_info",
          title: tExtAdmin("project_information"),
          description: tExtAdmin("basic_details_about_the_ico_project_and_token"),
          fields: [
            {
              key: "name",
              required: true,
              minLength: 1,
              maxLength: 191,
            },
            {
              key: "symbol",
              required: true,
              minLength: 1,
              maxLength: 10,
            },
            {
              key: "icon",
              required: true,
              maxLength: 191,
            },
          ],
        },
        {
          id: "fundraising",
          title: tExtAdmin("fundraising_details"),
          description: tExtAdmin("target_amounts_and_pricing_information"),
          fields: [
            {
              key: "targetAmount",
              required: true,
              min: 0,
            },
            {
              key: "tokenPrice",
              required: true,
              min: 0,
            },
            {
              key: "currentPrice",
              required: false,
              min: 0,
            },
            {
              key: "priceChange",
              required: false,
            },
          ],
        },
        {
          id: "wallet_config",
          title: tExtAdmin("wallet_configuration"),
          description: tExtAdmin("purchase_wallet_settings"),
          fields: [
            {
              key: "purchaseWalletCurrency",
              required: true,
              minLength: 1,
              maxLength: 10,
            },
            {
              key: "purchaseWalletType",
              required: true,
              minLength: 1,
              maxLength: 191,
            },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          description: tExtAdmin("important_dates_for_the_token_sale"),
          fields: [
            {
              key: "startDate",
              required: true,
            },
            {
              key: "endDate",
              required: true,
            },
            {
              key: "submittedAt",
              required: false,
            },
            {
              key: "approvedAt",
              required: false,
            },
            {
              key: "rejectedAt",
              required: false,
            },
          ],
        },
        {
          id: "status_settings",
          title: tExtAdmin("status_settings"),
          description: tExtAdmin("current_status_and_configuration"),
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "SUCCESS", label: tExt("success") },
                { value: "FAILED", label: tCommon("failed") },
                { value: "UPCOMING", label: tCommon("upcoming") },
                { value: "PENDING", label: tCommon("pending") },
                { value: "REJECTED", label: tCommon("rejected") },
                { value: "DISABLED", label: tCommon("disabled") },
              ],
            },
            {
              key: "isPaused",
              required: true,
            },
            {
              key: "isFlagged",
              required: true,
            },
            {
              key: "featured",
              required: false,
            },
          ],
        },
        {
          id: "additional_info",
          title: tCommon("additional_information"),
          description: tExtAdmin("optional_project_details"),
          fields: [
            {
              key: "website",
              required: false,
              maxLength: 191,
            },
            {
              key: "reviewNotes",
              required: false,
              maxLength: 191,
            },
            {
              key: "participants",
              required: true,
              min: 0,
            },
          ],
        },
      ],
    }};
}
