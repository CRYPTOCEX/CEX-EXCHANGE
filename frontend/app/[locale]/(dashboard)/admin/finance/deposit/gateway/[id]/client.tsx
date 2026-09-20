"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Coins,
  CreditCard,
  FlaskConical,
  KeyRound,
  Percent,
  Plug,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  Webhook,
  Wrench,
  XCircle,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Loadable } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import { useToast } from "@/hooks/use-toast";
import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";

import {
  READINESS_LABEL,
  READINESS_TONE,
  readinessOf,
  type GatewayDetailResponse,
} from "../types";
import { GatewayDetails, detailsComplete } from "./components/gateway-details";
import { GatewayMoney } from "./components/gateway-money";
import { SetupGuide } from "./components/setup-guide";
import { useTranslations } from "next-intl";

const READINESS_ICON = {
  live: CheckCircle2,
  "cannot-confirm": Webhook,
  "ready-but-off": ShieldCheck,
  "on-but-unconfigured": AlertTriangle,
  "needs-credentials": KeyRound,
  unsupported: Plug,
} as const;

/**
 * A gateway, end to end: whether it works, how to make it work, and what it
 * charges.
 *
 * The page this replaces was an edit form. That framing was the problem — the
 * fields it edited (title, fees, limits, a 160-button currency grid) are not
 * what stops a gateway taking money. Credentials, a webhook URL and a
 * test-versus-live key are, and none of them are columns, so none of them were
 * anywhere in the admin. Setup leads for that reason; the editable columns
 * follow it.
 */
export function AdminGatewayEditClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const gatewayId = params.id as string;

  const [formData, setFormData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [detail, setDetail] = useState<GatewayDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [tab, setTab] = useState("setup");

  /** Re-read the environment half without touching the unsaved form half. */
  const loadConfig = useCallback(async () => {
    const { data } = await $fetch<GatewayDetailResponse>({
      url: `/api/admin/finance/deposit/gateway/${gatewayId}/config`,
      silent: true,
    });
    if (data) setDetail(data);
  }, [gatewayId]);

  const loadGateway = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    /*
     * Both halves at once. They are independent — one is the row, the other is
     * the process environment — and serialising them doubles the time the page
     * spends without a name in its header.
     */
    const [row, config] = await Promise.all([
      $fetch<any>({
        url: `/api/admin/finance/deposit/gateway/${gatewayId}`,
        silent: true,
      }),
      $fetch<GatewayDetailResponse>({
        url: `/api/admin/finance/deposit/gateway/${gatewayId}/config`,
        silent: true,
      }),
    ]);

    if (!row.data) {
      /*
       * `$fetch` resolves `{data, error}` rather than throwing, so a server
       * failure lands here too — report it instead of always blaming a missing
       * gateway.
       */
      setError(
        typeof row.error === "string" && row.error
          ? row.error
          : t("gateway_not_found")
      );
      setIsLoading(false);
      return;
    }

    const parsed = { ...row.data };
    // `currencies` is a JSON column and arrives as an array on MySQL 8 and as a
    // JSON string on the older driver path.
    if (typeof parsed.currencies === "string") {
      try {
        parsed.currencies = JSON.parse(parsed.currencies);
      } catch {
        parsed.currencies = [];
      }
    }
    if (!Array.isArray(parsed.currencies)) parsed.currencies = [];

    setFormData(parsed);
    setOriginalData(parsed);
    if (config.data) setDetail(config.data);
    setIsLoading(false);
  }, [gatewayId]);

  useEffect(() => {
    if (gatewayId) void loadGateway();
  }, [gatewayId, loadGateway]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  /*
   * Derived, not tracked in state.
   *
   * The previous page recomputed `hasChanges` inside the setter and stored it,
   * which meant the flag and the data were two sources that could disagree —
   * and did, after a save: `originalData` was updated but `hasChanges` was set
   * separately, so any ordering change between them left the Save button lit on
   * a saved form.
   */
  const hasChanges = useMemo(
    () =>
      Boolean(formData) &&
      JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData]
  );

  const canSave = hasChanges && detailsComplete(formData);

  const handleSave = async () => {
    if (!formData) return;

    if (!detailsComplete(formData)) {
      setTab("details");
      toast({
        title: t("some_required_details_are_missing"),
        description:
          t("a_display_title_a_description_and"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = formData.image;

      if (formData.imageFile instanceof File) {
        const upload = await imageUploader({
          file: formData.imageFile,
          dir: "gateways",
          size: { width: 200, height: 100, maxWidth: 400, maxHeight: 200 },
          oldPath: typeof formData.image === "string" ? formData.image : "",
        });
        if (!upload.success || !upload.url) {
          throw new Error(`Failed to upload the logo: ${upload.error}`);
        }
        imageUrl = upload.url;
      }

      /*
       * `alias` is NOT sent. It is the key that maps this row to its payment
       * handler and the API no longer accepts it — see the comment on
       * admin/finance/deposit/gateway/[id]/index.put.ts.
       */
      const { data, error: saveError } = await $fetch({
        url: `/api/admin/finance/deposit/gateway/${gatewayId}`,
        method: "PUT",
        body: {
          title: formData.title,
          description: formData.description,
          image: imageUrl,
          currencies: Array.isArray(formData.currencies)
            ? formData.currencies
            : [],
          fixedFee: formData.fixedFee,
          percentageFee: formData.percentageFee,
          minAmount: formData.minAmount,
          maxAmount: formData.maxAmount,
          status: formData.status,
        },
      });

      if (saveError || !data) {
        throw new Error(
          typeof saveError === "string" ? saveError : "The update failed"
        );
      }

      /*
       * Stay on the page. The previous version navigated back to the list on
       * every save, which is wrong for a page whose main job — pasting keys,
       * testing them, pasting a webhook URL — is iterative: an operator saves a
       * fee and is thrown out of the setup guide they were halfway through.
       * `imageFile` is dropped from the new baseline so an unchanged form does
       * not read as dirty because a File object is still hanging off it.
       */
      const saved = { ...formData, image: imageUrl };
      delete saved.imageFile;
      setFormData(saved);
      setOriginalData(saved);

      toast({
        title: t("gateway_updated"),
        description: t("has_been_saved", { title: String(formData.title) }),
      });
      void loadConfig();
    } catch (err) {
      toast({
        title: t("could_not_save_the_gateway"),
        description: err instanceof Error ? err.message : tCommon("unknown_error"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setFormData(originalData);
    setShowUnsavedDialog(false);
  };

  const handleBack = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
      return;
    }
    router.push("/admin/finance/deposit/gateway");
  };

  /**
   * The switch writes immediately, on its own endpoint, independent of the
   * form.
   *
   * It is the one control here that changes customer-visible behaviour, and
   * burying it behind a Save that also writes fees and limits means an operator
   * cannot turn a misbehaving gateway off without also committing whatever else
   * they had half-edited.
   */
  const toggleStatus = async (next: boolean) => {
    setStatusPending(true);
    const { error: statusError } = await $fetch({
      url: `/api/admin/finance/deposit/gateway/${gatewayId}/status`,
      method: "PUT",
      body: { status: next },
      silent: true,
    });
    setStatusPending(false);

    if (statusError) {
      toast({
        title: t("could_not_change_the_gateway_status"),
        description:
          typeof statusError === "string" ? statusError : t("the_update_failed"),
        variant: "destructive",
      });
      return;
    }

    setFormData((prev: any) => ({ ...prev, status: next }));
    setOriginalData((prev: any) => (prev ? { ...prev, status: next } : prev));

    if (next && detail && !detail.health.credentialsComplete) {
      toast({
        title: t("switched_on_but_it_cannot_authenticate"),
        description: `${detail.health.missingRequired.length} required environment variable${
          detail.health.missingRequired.length === 1 ? " is" : tCommon("s_are")
        } unset, so every deposit through it will fail.`,
        variant: "destructive",
      });
    } else if (next && detail && detail.health.inboundComplete === false) {
      /*
       * Only reachable once the branch above is false — i.e. the gateway CAN
       * take the payment. That is what makes it the worse of the two: nothing
       * fails in front of the customer, so the operator's only evidence is a
       * deposit that never arrives.
       */
      toast({
        title: "Switched on, and it cannot confirm a payment",
        description: `${detail.health.missingInbound.join(", ")} ${
          detail.health.missingInbound.length === 1 ? "is" : "are"
        } unset, so the confirmation webhook refuses every delivery. Customers can pay and may not be credited.`,
        variant: "destructive",
      });
    }
  };

  const readiness = readinessOf({
    supported: detail?.health.supported ?? false,
    status: Boolean(formData?.status),
    credentialsComplete: detail?.health.credentialsComplete ?? false,
    // `?? null`, never `?? false`: null is "this integration has no webhook",
    // and false would put a destructive verdict on Stripe and PayPal.
    inboundComplete: detail?.health.inboundComplete ?? null,
  });
  /*
   * The header glyph, as a VALUE.
   *
   * `{isLoading ? <ShieldCheck/> : <ReadinessIcon/>}` would have been the
   * obvious spelling and it is two trees for one 12px box — the scanner's
   * `divergent-branch` rule names exactly that. Picking the component instead
   * of picking the element leaves one `<HeaderReadinessIcon/>` in the JSX, so
   * the box cannot disagree with itself. `ShieldCheck` is the pending glyph
   * because it is the only one in the map that asserts nothing about the
   * verdict.
   */
  const HeaderReadinessIcon = isLoading
    ? ShieldCheck
    : READINESS_ICON[readiness];

  if (error) {
    return (
      /* The failure state sits on the SAME ground as the page it stands in
         for. Without it, a gateway that fails to load drops the operator onto
         a flat field one route away from a screen that has structure — the
         inconsistency reads as a second, broken product rather than as an
         error. `min-h-screen` because the ground is `fixed`. */
      <div className="min-h-screen">
        <WorkspaceGround />
        <div className="container mx-auto max-w-2xl px-4 pb-16 pt-24">
          <Card padding="lg" className="text-center">
            <XCircle
              className="mx-auto mb-3 h-12 w-12 text-destructive opacity-60"
              aria-hidden
            />
            <p className="font-medium">{t("could_not_load_this_gateway")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadGateway()}
              >
                <RotateCcw className="h-4 w-4" />
                {tCommon("try_again")}
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/finance/deposit/gateway">
                  <ArrowLeft className="h-4 w-4" />
                  {t("back_to_gateways")}
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    /*
      THE WORKSPACE GROUND, AND WHY THE HEADER BAND CAME OFF WITH IT.

      This screen was a flat `bg-background` field carrying a `border-b bg-card`
      strip at the top — and the LIST page one level up
      (`../page.tsx`) already renders `HeroSection`, which mounts
      `WorkspaceGround` for free. So the two halves of one feature sat on two
      different grounds: click a gateway and the page you land on looks like a
      different, emptier product than the gallery you left.

      `WorkspaceGround` is the ground the rest of the product is on — p2p's
      non-landing routes, /support, the AI-support console, `PageShell`,
      `HeroSection` and every DataTable hero. A masked 72px hairline grid, one
      surface-ramp step and a single 4% stop of the accent, all of it spent in
      the top ~380px and gone before the first field. See
      components/layout/workspace-ground.tsx.

      The band had to go, and this is not a taste call — it is the same finding
      `hero-section.tsx` records for the 90-odd pages it replaced. `bg-card` is
      OPAQUE: left in place it paints straight over the grid and the ramp for
      exactly the band the ground was drawn to occupy, so the edit would have
      been a no-op above the fold and a change only below it. And over one
      continuous ground the `border-b` is a rule across the middle of nothing —
      the ground's own ramp fades out at roughly that height and is the soft
      edge the border was drawing hard. The two wrappers collapse to one
      because with no background left there is nothing full-bleed to draw.

      `min-h-screen` stays: the ground is `fixed inset-0 -z-10`, so the shell
      still has to be tall enough to own the viewport. `pt-24` stays because
      `site-header.tsx` is `fixed top-0` over an `h-16` bar.
    */
    <div className="min-h-screen pb-24">
      <WorkspaceGround />

      {/* ---- header ------------------------------------------------------ */}
      <div className="container mx-auto px-4 pb-6 pt-24">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="-ms-2 mb-3 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("payment_gateways")}
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {/* White in both themes — see the note on the same plate in
                components/gateway-card.tsx: these are third-party brand marks
                drawn as dark ink for a light ground. */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-2">
              <ImageWithFallback
                src={formData?.image}
                alt=""
                /* `fill` + `object-contain`, and `priority` because this is
                   the page's LCP element — see the note on the same image in
                   components/gateway-card.tsx for why the size is not
                   declared. */
                fill
                sizes="56px"
                priority
                className="object-contain"
                fallback={
                  <CreditCard
                    className="h-6 w-6 text-muted-foreground"
                    aria-hidden
                  />
                }
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {/* Was an NBSP hack — a literal U+00A0 substituted for the
                    title while loading, which held the line box open and
                    nothing else, so the heading read as a blank gap rather
                    than as a pending value. `Loadable` reserves the same box
                    from the same `text-2xl sm:text-3xl` element AND paints
                    it, without this file having to know the line height. */}
                <Loadable loading={isLoading} placeholder={t("gateway_name")}>
                  {formData?.title || t("unknown_gateway")}
                </Loadable>
              </h1>
              {/*
                THE BADGE ROW RENDERS IN BOTH STATES.

                It was `{!isLoading && (<>…</>)}`, so the row was an empty
                22px-tall-when-filled flex box measuring ZERO while the two
                requests were in flight — and this row sits in the page
                header, above the tab bar and above every panel. The whole
                page below it dropped ~28px the moment the fetch landed.

                What the badges SAY had to be handled separately, and it is
                the more interesting half. `readinessOf` is a pure function of
                three booleans that all default to false here, and
                `readinessOf({supported: false, …})` returns "unsupported",
                whose label is "No integration". Rendering the row eagerly
                without this would have told the operator that the gateway
                they are looking at has no integration bundled — then
                corrected itself to "Accepting deposits". So the tone is
                neutralised and the label carries a placeholder until the
                verdict is real.
              */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge
                  tone={isLoading ? "neutral" : READINESS_TONE[readiness]}
                  appearance="soft"
                >
                  {/* Resolved to a VALUE rather than branched on, so there is
                      one 12px glyph box in both states. */}
                  <HeaderReadinessIcon className="h-3 w-3" aria-hidden />
                  <Loadable
                    loading={isLoading}
                    placeholder={READINESS_LABEL["live"]}
                  >
                    {READINESS_LABEL[readiness]}
                  </Loadable>
                </Badge>
                {/* The keys badge is genuinely OPTIONAL — `mode` is "unknown"
                    for a gateway with no credentials set, and then it never
                    appears at all. It is the last chip in a wrap row whose
                    height is already held by the two badges either side of
                    it, so it is the one thing here that can arrive late
                    without moving anything vertically. Left gated. */}
                {detail?.health.mode &&
                  detail.health.mode !== "unknown" && (
                    <Badge
                      tone={
                        detail.health.mode === "live" ? "info" : "neutral"
                      }
                      appearance="outline"
                    >
                      {detail.health.mode === "live" ? (
                        <Radio className="h-3 w-3" aria-hidden />
                      ) : (
                        <FlaskConical className="h-3 w-3" aria-hidden />
                      )}
                      {detail.health.mode === "live"
                        ? t("live_keys")
                        : t("test_keys")}
                    </Badge>
                  )}
                <Badge
                  tone="neutral"
                  appearance="outline"
                  className="font-mono"
                >
                  <Loadable loading={isLoading} placeholder="gateway_alias">
                    {formData?.alias || formData?.name}
                  </Loadable>
                </Badge>
              </div>
            </div>
          </div>

          {/* `bg-card`, not `bg-background`. This box was a RECESSED well: it
              sat on the `bg-card` band, and `--background` one rung below the
              strip read as inset. With the band gone the relationship inverts —
              `--background` is the ground's own base colour, so the box would
              punch a flat hole through the hairline grid and read as absence
              rather than as the one interactive control in the header. `--card`
              is the raised rung of the same ramp, which is what a control
              cluster over a textured ground has to be. */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-end">
              {/* `Boolean(undefined)` is false, so this read "Not offered"
                  for the whole fetch — a definite claim about a gateway that
                  may well be live, sitting directly beside a switch drawn in
                  the off position. The switch itself is already
                  `disabled={isLoading}`; the label now waits too. */}
              <p className="text-sm font-medium">
                <Loadable loading={isLoading} placeholder={t("accepting_deposits")}>
                  {formData?.status ? t("accepting_deposits") : t("not_offered")}
                </Loadable>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("saves_immediately")}
              </p>
            </div>
            <Switch
              checked={Boolean(formData?.status)}
              disabled={isLoading || statusPending}
              onCheckedChange={(next) => void toggleStatus(next)}
              aria-label={
                formData?.status ? t("disable_this_gateway") : t("enable_this_gateway")
              }
            />
          </div>
        </div>
      </div>

      {/* ---- body -------------------------------------------------------- */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="setup">
              <Wrench className="h-4 w-4" />
              Setup
              {detail &&
                (!detail.health.credentialsComplete ||
                  detail.health.inboundComplete === false) && (
                  /* Destructive for the inbound failure, because that one is
                     true of a gateway that is otherwise finished and is
                     already taking money. */
                  <span
                    className={
                      detail.health.inboundComplete === false
                        ? "ms-1 h-1.5 w-1.5 rounded-full bg-destructive"
                        : "ms-1 h-1.5 w-1.5 rounded-full bg-warning"
                    }
                    aria-label={tCommon("needs_attention")}
                  />
                )}
            </TabsTrigger>
            <TabsTrigger value="details">
              <Coins className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="money">
              <Percent className="h-4 w-4" />
              {t("fees_limits")}
            </TabsTrigger>
          </TabsList>

          {/*
            THREE PANELS, ONE COMPONENT EACH — the `PanelSkeleton` swap is gone.

            Each tab used to read `isLoading || !x ? <PanelSkeleton/> : <Real/>`,
            i.e. a second tree per tab, all three sharing ONE generic look-alike
            that was two cards of grey bars regardless of which panel it stood
            in for. The details tab resolves into three cards, the money tab
            into three, the setup tab into six — so on arrival every tab grew,
            and the setup tab grew by roughly a screen.

            Two of the three are FORMS, and a form has nothing to skeleton:
            labels, help text, card headers and input boxes are all knowable
            before the row loads, and an `<Input>` is the same 36px box empty or
            full. So they render for real with `loading` disabling the controls
            — which also closes the edit-then-get-overwritten race, exactly as
            on the unsubscribe page. The setup panel owns its own pending state
            (see `PendingPanels` in setup-guide.tsx) because its body length is
            per-vendor and genuinely unknowable.
          */}
          <div className="mt-4">
            <TabsContent value="setup">
              <SetupGuide
                gatewayId={gatewayId}
                detail={detail}
                loading={isLoading}
                onRefresh={() => void loadConfig()}
              />
            </TabsContent>

            <TabsContent value="details">
              <GatewayDetails
                gateway={formData}
                loading={isLoading}
                onChange={handleFieldChange}
              />
            </TabsContent>

            <TabsContent value="money">
              <GatewayMoney
                gateway={formData}
                loading={isLoading}
                onChange={handleFieldChange}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ---- save bar ----------------------------------------------------- */}
      {hasChanges && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-warning" aria-hidden />
              {tCommon("unsaved_changes")}
              {!detailsComplete(formData) && (
                <span className="text-muted-foreground">
                  {t("a_title_a_description_and_one")}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                loading={isSubmitting}
                disabled={isSubmitting || !canSave}
              >
                {!isSubmitting && <Save className="h-4 w-4" />}
                {tCommon("save_changes")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("unsaved_changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("you_have_edits_that_have_not")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep_editing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedDialog(false);
                router.push("/admin/finance/deposit/gateway");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("discard_and_leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
