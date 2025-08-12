"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PoolFormValues } from "./pool-form";
import {
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Award,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface PoolFormPreviewProps {
  formData: PoolFormValues;
}

export function PoolFormPreview({ formData }: PoolFormPreviewProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-6">
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle>{t("pool_preview")}</CardTitle>
          <CardDescription>
            {t("preview_how_your_staking_pool_will_appear_to_users")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 mr-3 flex items-center justify-center">
                    {formData.symbol ? (
                      <span className="font-bold text-primary">
                        {formData.symbol.substring(0, 1)}
                      </span>
                    ) : (
                      <span className="font-bold text-primary">?</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formData.name || "Pool Name"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formData.symbol || "SYM"}
                    </p>
                  </div>
                </div>
                <Badge variant={formData.isPromoted ? "default" : "outline"}>
                  {formData.isPromoted
                    ? "Featured"
                    : formData.status === "ACTIVE"
                      ? "Active"
                      : formData.status === "INACTIVE"
                        ? "Inactive"
                        : "Coming Soon"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("APR")}</span>
                  <span className="text-xl font-bold text-green-500">
                    {formData.apr}%
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("lock_period")}
                    </span>
                    <span>
                      {formData.lockPeriod}
                      {t("days")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("Min")}. {t("Stake")}
                    </span>
                    <span>
                      {formData.minStake} {formData.symbol || "SYM"}
                    </span>
                  </div>
                  {formData.maxStake && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("Max")}. {t("Stake")}
                      </span>
                      <span>
                        {formData.maxStake} {formData.symbol || "SYM"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("pool_capacity")}
                    </span>
                    <span>
                      {formData.maxPoolSize
                        ? `${formData.maxPoolSize} ${formData.symbol || "SYM"}`
                        : "Unlimited"}
                    </span>
                  </div>
                  {formData.maxPoolSize && (
                    <>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: "15%" }} // Simulated fill for preview
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          0
                          {formData.symbol || "SYM"}
                        </span>
                        <span>
                          {formData.maxPoolSize} {formData.symbol || "SYM"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {formData.description && (
                  <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {formData.description}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button className="w-full">
                {t("view_details")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {(formData.risks ||
            formData.rewards ||
            formData.profitSource ||
            formData.fundAllocation) && (
            <div className="space-y-4">
              {formData.risks && (
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">{t("Risks")}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {formData.risks}
                    </p>
                  </div>
                </div>
              )}

              {formData.rewards && (
                <div className="flex items-start gap-2">
                  <Award className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">{t("Rewards")}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {formData.rewards}
                    </p>
                  </div>
                </div>
              )}

              {formData.profitSource && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">
                      {t("profit_source")}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {formData.profitSource}
                    </p>
                  </div>
                </div>
              )}

              {formData.externalPoolUrl && (
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">
                      {t("external_pool")}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {formData.externalPoolUrl}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
