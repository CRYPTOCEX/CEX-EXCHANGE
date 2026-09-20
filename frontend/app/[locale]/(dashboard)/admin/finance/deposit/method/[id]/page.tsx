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
import { Loadable } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ActivityTimeline, TimelineEvent } from "@/components/ui/activity-timeline";
import { Plus } from "lucide-react";

// Finance-theme ambient wash for the hero orbs/particles. Full `hsl(var(--x))`
// because both are consumed as CSS colour VALUES, never concatenated.
const FINANCE_COLORS = {
  primary: "hsl(var(--success))",
  secondary: "hsl(var(--success) / 0.7)",
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

/**
 * The ruler for the instructions block, and it has to contain SPACES.
 *
 * `SkeletonText` lays its placeholder out for real and paints over it, so the
 * string is what produces the reserved box. A run of zeroes has no break
 * opportunity, and this paragraph is `whitespace-pre-wrap` with no `break-words`
 * — an unbreakable 200-character token would push a horizontal scrollbar
 * instead of wrapping to the two or three lines the real instructions occupy.
 * A representatively-shaped sentence wraps exactly as the real one will.
 */
const INSTRUCTIONS_PLACEHOLDER =
  "Transfer the exact amount shown to the account details below, then upload " +
  "your payment receipt so an operator can confirm the deposit and credit your " +
  "wallet.";

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
  /*
    `true`, and that is a bug fix rather than a style change.

    It was `false`, so the very first render had no method AND was not loading —
    which is exactly the condition the "Payment method not found" screen tested.
    Every visit to this page therefore painted a full-viewport red X and
    "Requested deposit method not found" for one frame before the effect had
    even fired. The request is in flight from mount; the state should say so
    from mount.
  */
  const [isLoading, setIsLoading] = useState(true);

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

  const getStatusColor = (status: boolean) => {
    return status
      ? "bg-success/50 border-success/40"
      : "bg-destructive/50 border-destructive/40";
  };

  /**
   * TWO EARLY RETURNS USED TO LIVE HERE, AND BETWEEN THEM THIS PAGE HAD THREE
   * DIFFERENT LAYOUTS.
   * ==========================================================================
   *
   * `if (isLoading) return <DepositMethodLoading/>` handed the whole route to a
   * hand-written second copy in `./loading.tsx` — and that copy had already
   * drifted: it paints a `min-h-[60vh]` primary-gradient hero this page does not
   * have, and three admin action buttons where the page has two. A duplicate
   * tree has nothing keeping it in sync, which is the entire argument in
   * SKELETONS.md.
   *
   * `if (!method) return <min-h-screen not-found/>` was the second, and it did
   * double duty as the pending state on first paint (see the `isLoading`
   * initial value above).
   *
   * There is one layout now. `methodMissing` is named here rather than written
   * inline because "there is no such method" is a CONCLUSION — it is only
   * reachable once the request has finished — while pending is not, and the two
   * were the same expression before.
   */
  const methodMissing = !isLoading && !method;

  /* Neutral while pending. The pill is `absolute`, so its tint costs no layout
     either way — but painting it destructive-red for "inactive" before the
     record has landed is a claim about the method we have not earned. */
  const statusTint = isLoading
    ? "bg-muted border-border"
    : getStatusColor(method?.status ?? false);

  /* The timeline is derived entirely from the record's two timestamps, so it
     has nothing to show until the record exists. `ActivityTimeline` takes no
     `loading` prop, so the pending state is expressed through `emptyMessage`
     below rather than by withholding the card. */
  const timelineEvents: TimelineEvent[] = [];
  if (method) {
    timelineEvents.push({
      id: "created",
      type: "created",
      title: t("method_created"),
      description: t("payment_method_was_created"),
      timestamp: method.createdAt,
      icon: Plus,
      badge: t("initial"),
      details: {
        [tCommon("method_id")]: method.id,
        [tCommon("title")]: method.title,
      },
    });

    if (method.updatedAt && method.updatedAt !== method.createdAt) {
      timelineEvents.push({
        id: "updated",
        type: "updated",
        title: tCommon("last_updated"),
        description: t("payment_method_was_modified"),
        timestamp: method.updatedAt,
        icon: Edit,
        badge: tCommon("modified"),
        details: {
          [tCommon("method_id")]: method.id,
        },
      });
    }
  }

  return (
    <>
      {/* Hero Section */}
      <HeroSection
        /*
          `HeroSection` types `title` and `description` as STRINGS, so neither
          can hold a `<Loadable>` without changing a shared primitive this task
          does not own. A stable fallback is the next best thing and the pattern
          the other converted hero already uses (`formData.tierName || "Tier"`):
          the `<h1>` keeps its exact box in both states and never collapses,
          which is what would otherwise move the entire page.
        */
        title={method?.title || tCommon("payment_method")}
        titleClassName="text-3xl md:text-4xl"
        description={
          method
            ? method.instructions.substring(0, 150) +
              (method.instructions.length > 150 ? "..." : "")
            : t("displayed_to_users_during_deposit")
        }
        descriptionClassName="text-base md:text-lg max-w-2xl"
        layout="split"
        maxWidth="max-w-full"
        paddingTop="pt-[calc(var(--header-height)+1rem)]"
        paddingBottom="pb-6"
        titleLeftContent={
          <div className="relative">
            {/* The logo tile is a fixed 96/112px box in both states, so nothing
                here can move the layout — only what fills it changes, and the
                generic card glyph is the same fallback a method with no logo
                gets. That is why there is no skeleton block: there is no box to
                reserve that is not already reserved. */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-primary/10 p-1 shadow-lg">
              <div className="w-full h-full rounded-xl overflow-hidden bg-background flex items-center justify-center">
                {method?.image ? (
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
                statusTint
              )}
              variant="default"
            >
              <Loadable loading={isLoading} placeholder="Inactive">
                {method?.status ? tCommon("active") : tCommon("inactive")}
              </Loadable>
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
        stats={[
          { icon: DollarSign, label: tCommon("fixed_fee"), value: `$${method?.fixedFee?.toFixed(2) ?? "0.00"}` },
          { icon: Percent, label: tCommon("percentage_fee"), value: `${method?.percentageFee ?? 0}%` },
          { icon: ArrowDownCircle, label: tCommon("min_amount"), value: `$${method?.minAmount?.toLocaleString() ?? "0"}` },
          { icon: ArrowUpCircle, label: tCommon("max_amount"), value: method?.maxAmount
                    ? `$${method.maxAmount.toLocaleString()}`
                    : "∞" },
        ]}
        statsLoading={isLoading}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 px-2.5 py-1">
            ID{" "}
            <Loadable loading={isLoading} placeholder="a1b2c3d4">
              {method?.id.slice(0, 8)}
            </Loadable>
            ...
          </Badge>
        </div>
      </HeroSection>

      {/* Main Content */}
      <div className="container mx-auto pt-6 pb-8 space-y-6">
        <div className="flex flex-col gap-6">
          {/*
            NOT FOUND — a card at the top of the page, not instead of the page.

            The old version was a `min-h-screen` centred column that replaced
            everything, so a bad id produced a document with a different height
            and no hero at all. The frame stays; this says what happened and
            offers the way back.
          */}
          {methodMissing && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-semibold">
                    {t("payment_method_not_found")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("requested_deposit_method_not_found")}
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/admin/finance/deposit/method")}
                  variant="outline"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("back_to_methods")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Admin Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>{tCommon("admin_actions")}</CardTitle>
              <CardDescription>{t("manage_this_deposit_method")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={method?.status ? "outline" : "default"}
                  className={method?.status ? "" : "bg-success hover:bg-success"}
                >
                  {method?.status ? (
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
                  {tCommon("delete_method")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fee Details Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>{tCommon("fee_breakdown")}</span>
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
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <DollarSign className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{tCommon("fixed_fee")}</p>
                        <p className="text-[11px] text-subtle-foreground">{t("charged_per_transaction")}</p>
                      </div>
                    </div>
                    {/* Placeholder INSIDE the `text-2xl leading-tight` figure,
                        so its height is produced by the same text layout the
                        real number will use. The `$` waits with the digits — a
                        lone currency sign is not information. */}
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <Loadable loading={isLoading} placeholder="$1.50">
                        ${method?.fixedFee}
                      </Loadable>
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <Percent className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{tCommon("percentage_fee")}</p>
                        <p className="text-[11px] text-subtle-foreground">{t("of_deposit_amount")}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <Loadable loading={isLoading} placeholder="2.5%">
                        {method?.percentageFee}%
                      </Loadable>
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <ArrowDownCircle className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{tCommon("minimum_deposit")}</p>
                        <p className="text-[11px] text-subtle-foreground">{t("lowest_allowed_amount")}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <Loadable loading={isLoading} placeholder="$10.00">
                        ${method?.minAmount}
                      </Loadable>
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t("maximum_deposit")}</p>
                        <p className="text-[11px] text-subtle-foreground">{t("highest_allowed_amount")}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <Loadable loading={isLoading} placeholder="$50,000">
                        {method?.maxAmount
                          ? `$${method.maxAmount.toLocaleString()}`
                          : "∞"}
                      </Loadable>
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
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div>
                  <CardTitle>{tCommon("payment_instructions")}</CardTitle>
                  <CardDescription>{t("displayed_to_users_during_deposit")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                  <Loadable
                    loading={isLoading}
                    placeholder={INSTRUCTIONS_PLACEHOLDER}
                  >
                    {method?.instructions}
                  </Loadable>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields Section — genuinely optional data. Most methods have
              none, so there is no honest box to reserve here: whether this card
              exists at all is part of what the fetch answers. */}
          {method?.customFields && Array.isArray(method.customFields) && method.customFields.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                    <QrCode className="h-3.5 w-3.5" />
                  </span>
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
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
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
                                  alt={t("qr_code_for", { title: String(field.title) })}
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

          {/* Timeline Section — the card, its header, its icon tile and its
              description are chrome and render in both states. Only the events
              wait, and the empty COPY is swapped rather than the card, because
              "no activity recorded" is a conclusion and a request in flight has
              not reached one. */}
          <ActivityTimeline
            title={tCommon("activity_timeline")}
            description={t("history_of_method_changes")}
            titleIcon={Clock}
            emptyMessage={
              isLoading ? `${tCommon("loading")}...` : t("no_activity_recorded")
            }
            events={timelineEvents}
          />
        </div>
      </div>
    </>
  );
}
