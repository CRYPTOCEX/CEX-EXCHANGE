"use client";

import React, { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  XCircle,
  DollarSign,
  QrCode,
  FileText,
  Image as ImageIcon,
  Upload,
  CreditCard,
  Percent,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit,
  Power,
  PowerOff,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { HeroSection } from "@/components/ui/hero-section";
import { Lightbox } from "@/components/ui/lightbox";
import { cn } from "@/lib/utils";
import DepositMethodLoading from "./loading";
import { ActivityTimeline, TimelineEvent } from "@/components/ui/activity-timeline";
import { Plus } from "lucide-react";

// Finance Theme hex colors for particles/orbs
const FINANCE_COLORS = {
  primary: "#10b981", // emerald-500
  secondary: "#059669", // emerald-600
};

// DepositMethod interface
interface DepositMethod {
  id: string;
  title: string;
  instructions: string;
  image?: string;
  fixedFee: number;
  percentageFee: number;
  minAmount: number;
  maxAmount?: number;
  status: boolean;
  customFields?: CustomField[];
  createdAt: string;
  updatedAt: string;
}

interface CustomField {
  name: string;
  title: string;
  type: "input" | "textarea" | "file" | "image" | "qr";
  required: boolean;
  value?: string;
}

const fieldTypeIcons = {
  input: FileText,
  textarea: FileText,
  file: Upload,
  image: ImageIcon,
  qr: QrCode,
};

export default function DepositMethodViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMethod = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/deposit/method/${unwrappedParams.id}`,
        silent: true,
      });
      if (!error && data) {
        // Parse customFields if they come as JSON string
        const parsedData = { ...data };
        if (typeof parsedData.customFields === 'string') {
          try {
            parsedData.customFields = JSON.parse(parsedData.customFields);
          } catch (e) {
            parsedData.customFields = [];
          }
        }
        // Ensure customFields is always an array
        if (!Array.isArray(parsedData.customFields)) {
          parsedData.customFields = [];
        }

        setMethod(parsedData);
      }
    } catch (err) {
      console.error("Failed to fetch deposit method", err);
    } finally {
      setIsLoading(false);
    }
  }, [unwrappedParams.id]);

  useEffect(() => {
    if (unwrappedParams.id) {
      fetchMethod();
    }
  }, [unwrappedParams.id, fetchMethod]);

  if (isLoading) {
    return <DepositMethodLoading />;
  }

  const getStatusColor = (status: boolean) => {
    return status
      ? "bg-green-500/50 border-green-500/40"
      : "bg-red-500/50 border-red-500/40";
  };

  if (!method) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background">
        <div className="flex items-center justify-center min-h-[60vh] pt-32">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-semibold">{t("payment_method_not_found")}</p>
              <p className="text-sm text-muted-foreground">{t("requested_deposit_method_not_found")}</p>
            </div>
            <Button onClick={() => router.push("/admin/finance/deposit/method")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back_to_methods")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <HeroSection
        title={method.title}
        titleClassName="text-3xl md:text-4xl"
        description={
          method.instructions.substring(0, 150) + (method.instructions.length > 150 ? "..." : "")
        }
        descriptionClassName="text-base md:text-lg max-w-2xl"
        layout="split"
        maxWidth="max-w-full"
        paddingTop="pt-20"
        paddingBottom="pb-6"
        showBorder={false}
        background={{
          orbs: [
            {
              color: FINANCE_COLORS.primary,
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: FINANCE_COLORS.secondary,
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: [FINANCE_COLORS.primary, FINANCE_COLORS.secondary],
          size: 8,
        }}
        titleLeftContent={
          <div className="relative">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-primary/10 p-1 shadow-lg">
              <div className="w-full h-full rounded-xl overflow-hidden bg-background flex items-center justify-center">
                {method.image ? (
                  <Lightbox
                    src={method.image || "/img/placeholder.svg"}
                    alt={method.title}
                    width={100}
                    height={100}
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <CreditCard className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
            </div>
            <Badge
              className={cn(
                "absolute -bottom-2 right-0 px-3 py-1 font-medium border shadow-sm",
                getStatusColor(method.status)
              )}
              variant="default"
            >
              {method.status ? tCommon("active") : tCommon("inactive")}
            </Badge>
          </div>
        }
        rightContent={
          <Link href="/admin/finance/deposit/method">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("back_to_methods")}
            </Button>
          </Link>
        }
        rightContentAlign="start"
        bottomSlot={
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <DollarSign className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tCommon("fixed_fee")}
                  </p>
                  <p className="font-semibold">
                    ${method.fixedFee?.toFixed(2) ?? "0.00"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <Percent className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tCommon("percentage_fee")}
                  </p>
                  <p className="font-semibold">{method.percentageFee}%</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <ArrowDownCircle className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tCommon("min_amount")}
                  </p>
                  <p className="font-semibold">
                    ${method.minAmount?.toLocaleString() ?? "0"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <ArrowUpCircle className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tCommon("max_amount")}
                  </p>
                  <p className="font-semibold">
                    {method.maxAmount
                      ? `$${method.maxAmount.toLocaleString()}`
                      : "∞"}
                  </p>
                </CardContent>
              </Card>
            </div>

          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 px-2.5 py-1">
            ID: {method.id.slice(0, 8)}...
          </Badge>
        </div>
      </HeroSection>

      {/* Main Content */}
      <div className="container mx-auto pt-6 pb-8 space-y-6">
        <div className="flex flex-col gap-6">
          {/* Admin Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>{tCommon("admin_actions")}</CardTitle>
              <CardDescription>{t("manage_this_deposit_method")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={method.status ? "outline" : "default"}
                  className={method.status ? "" : "bg-green-600 hover:bg-green-700"}
                >
                  {method.status ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      {t("disable_method")}
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      {t("enable_method")}
                    </>
                  )}
                </Button>
                <Button variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t("delete_method")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fee Details Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>{t("fee_breakdown")}</span>
                <Badge variant="outline" className="ml-2">
                  {tCommon("live")}
                </Badge>
              </CardTitle>
              <CardDescription>
                {t("detailed_fee_structure_for_this_payment_method")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{tCommon("fixed_fee")}</p>
                        <p className="text-sm text-muted-foreground">{t("charged_per_transaction")}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">${method.fixedFee}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <Percent className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">{tCommon("percentage_fee")}</p>
                        <p className="text-sm text-muted-foreground">{t("of_deposit_amount")}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{method.percentageFee}%</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                        <ArrowDownCircle className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium">{tCommon("minimum_deposit")}</p>
                        <p className="text-sm text-muted-foreground">{t("lowest_allowed_amount")}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">${method.minAmount}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-lime-100 dark:bg-lime-900/30 rounded-lg flex items-center justify-center">
                        <ArrowUpCircle className="h-5 w-5 text-lime-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("maximum_deposit")}</p>
                        <p className="text-sm text-muted-foreground">{t("highest_allowed_amount")}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">
                      {method.maxAmount ? `$${method.maxAmount.toLocaleString()}` : "∞"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground border-t pt-4">
              {t("fees_calculated_automatically_during_deposit_process")}
            </CardFooter>
          </Card>

          {/* Instructions Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <CardTitle>{tCommon("payment_instructions")}</CardTitle>
                  <CardDescription>{t("displayed_to_users_during_deposit")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                  {method.instructions}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields Section */}
          {method.customFields && Array.isArray(method.customFields) && method.customFields.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle>{t("required_custom_fields")}</CardTitle>
                    <CardDescription>
                      {t("custom_fields_description", { count: method.customFields.length })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {method.customFields.map((field, index) => {
                    const Icon = fieldTypeIcons[field.type] || FileText;
                    return (
                      <Card key={index} className="overflow-hidden border-2 hover:border-primary/30 transition-colors">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/50 rounded-xl flex items-center justify-center">
                                <Icon className="w-6 h-6 text-violet-600" />
                              </div>
                              <Badge variant={field.required ? "default" : "secondary"}>
                                {field.required ? tCommon("required") : tCommon("optional")}
                              </Badge>
                            </div>

                            <div>
                              <h4 className="font-semibold text-lg mb-1">{field.title}</h4>
                              <p className="text-sm text-muted-foreground">{tCommon("field_name")}: {field.name}</p>
                            </div>

                            <div className="pt-3 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  {tCommon("field_type")}
                                </span>
                                <Badge variant="outline" className="font-mono">
                                  {field.type}
                                </Badge>
                              </div>
                            </div>

                            {field.type === 'qr' && field.value && (
                              <div className="pt-3">
                                <Lightbox
                                  src={field.value}
                                  alt={`QR Code for ${field.title}`}
                                  className="w-full rounded-lg border shadow-sm"
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline Section */}
          <ActivityTimeline
            title={tCommon("activity_timeline")}
            description={t("history_of_method_changes")}
            titleIcon={Clock}
            emptyMessage={t("no_activity_recorded")}
            events={(() => {
              const events: TimelineEvent[] = [
                {
                  id: "created",
                  type: "created",
                  title: t("method_created"),
                  description: t("payment_method_was_created"),
                  timestamp: method.createdAt,
                  icon: Plus,
                  badge: t("initial"),
                  details: {
                    [t("method_id")]: method.id,
                    [tCommon("title")]: method.title,
                  },
                },
              ];

              if (method.updatedAt && method.updatedAt !== method.createdAt) {
                events.push({
                  id: "updated",
                  type: "updated",
                  title: tCommon("last_updated"),
                  description: t("payment_method_was_modified"),
                  timestamp: method.updatedAt,
                  icon: Edit,
                  badge: tCommon("modified"),
                  details: {
                    [t("method_id")]: method.id,
                  },
                });
              }

              return events;
            })()}
          />
        </div>
      </div>
    </>
  );
}
