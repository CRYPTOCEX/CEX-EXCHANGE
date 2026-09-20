"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSystemUpdateStore } from "@/store/update";
import { usePatchNotesStore, getPatchNotesType } from "@/store/patch-notes";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { MarkdownRenderer, isMarkdownContent } from "@/lib/markdown-renderer";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import { HeroSection } from "@/components/ui/hero-section";
import { ThemedArt } from "@/components/ui/themed-art";
import { Link } from "@/i18n/routing";
import { PanelTitle } from "@/components/admin/system/panel";
import { ReleaseRail } from "@/components/admin/system/release-rail";
import { compareVersions } from "@/lib/version-compare";
import { storeArt } from "@/lib/store-products";

/*
 * `framer-motion` IS GONE FROM THIS FILE.
 *
 * Twenty-one animated nodes, every one of them a pure entrance — no
 * `whileHover`, no `whileTap`, no exit, nothing bound to a state CHANGE. On the
 * unlicensed view they ran as one ladder: the hero at +0.0s, its icon tile at
 * +0.1s, the `<h1>` sliding in from `x: -20` at +0.2s, the tagline at +0.3s, the
 * description at +0.4s, the features heading at +0.4s with its six cards
 * staggering from +0.5s, and the activation card — the only thing on the page
 * anyone can act on — at +0.8s. So the control the page exists for arrived last,
 * most of a second after the words describing it.
 *
 * `hero-section.tsx` records the same finding for the 90-odd headings it
 * replaced ("nothing here MOVES between two states, so there is nothing for an
 * entrance to express"), the products list has had its ten-node ladder removed
 * for the same reason, and R12 caps motion at 300ms besides. The page is painted
 * AT REST. What motion is left is the `loading` spinners on the two update
 * controls, each bound to a request that is genuinely open.
 */

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Info,
  Key,
  LifeBuoy,
  ListOrdered,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

/**
 * The core product's store illustration.
 *
 * `storeArtForProduct` cannot resolve it: that helper keys off an `extension`
 * row's `name` / `chain` / `category`, and core is not a row in any of those
 * tables — it comes from `package.json`. The file exists (`bicrypto.svg`, with
 * the `-light` sibling `ThemedArt` needs), so the constant is the whole fix.
 */
const CORE_ART = storeArt("bicrypto");

const DOCS_URL = "https://docs.mashdiv.com/";
const SUPPORT_URL = "https://support.mashdiv.com";
const STORE_URL = "https://mashdiv.com/products/bicrypto";

/**
 * ===========================================================================
 * ONE FRAME FOR ALL FOUR VIEWS
 * ===========================================================================
 * This page had FOUR states — pending, backend-unreachable (undetectable, see
 * below), unlicensed and licensed — and hand-built the frame three times. The
 * three copies disagreed on every measurement they made:
 *
 *   - the product tile is `h-24 w-24` in the pending and unlicensed views and
 *     `h-20 w-20` in the licensed one, so the heading changed height the moment
 *     a licence verified;
 *   - the tagline is `text-xl text-primary` in two of them and `text-lg
 *     text-primary` in the third — and R2 reserves the accent for what is
 *     interactive or the one figure that matters, which a marketing line is
 *     neither of, at either size;
 *   - the description is `max-w-2xl` in two and `max-w-xl` in the third;
 *   - the Back row is the same twenty lines of JSX three times over.
 *
 * That is the failure mode the skeleton doc names: a duplicated layout has no
 * mechanism keeping it in sync with the layout it imitates. `extension/[id]`
 * hit exactly this and answered with one `ProductPageFrame`; this is the same
 * answer for the same reason, and both are `HeroSection` underneath — the
 * component 77 other pages already use.
 *
 * WHAT THE BACK ROW BECAME. It was a `Button variant="ghost"` firing
 * `router.push`, repeated per view, above a hand-rolled heading. It is
 * `HeroSection`'s `breadcrumb` now, which renders `@/i18n/routing`'s `Link` —
 * so it keeps the locale and supports middle-click and prefetch, none of which
 * an `onClick` did.
 *
 * AND THE GROUND. Each view's root carried `min-h-screen` with no page ground
 * at all, under a `pt-header-clear` container. `WorkspaceGround` is what every
 * other admin console sits on; it is mounted here, once, and `HeroSection` is
 * told `ground={false}` so a second `fixed inset-0` layer is not composited
 * only to be hidden by the dedupe rule in `globals.css`.
 */
function UpdateConsoleFrame({
  title,
  description,
  chips,
  actions,
  pending = false,
  children,
}: {
  /* `string`, not `ReactNode`: `HeroSection`'s `title` is
     `string | TitlePart[]`, and anything non-string falls into the array branch
     and is read for a `.text` it does not have. A pending title goes through
     the `pending` flag below, which builds the `TitlePart[]` form correctly. */
  title?: string;
  description?: React.ReactNode;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  pending?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen">
      <WorkspaceGround />

      <HeroSection
        ground={false}
        breadcrumb={{ text: tCommon("back_to_dashboard"), href: "/admin" }}
        title={
          pending
            ? [{ text: <SkeletonText placeholder="Bicrypto" /> }]
            : (title ?? "")
        }
        description={
          pending ? (
            <SkeletonText placeholder={t("manage_your_platform_updates_and_system")} />
          ) : (
            description
          )
        }
        layout="split"
        /* `start`, not `center`: the art is the taller column, so centring puts
           the whole text block against its middle and starts the breadcrumb
           ~90px down the band with empty ground above it. */
        rightContentAlign="start"
        rightContent={
          pending ? (
            /* The SAME box the real plate draws, so the heading does not change
               height when the art lands. */
            <SkeletonBlock className="aspect-[5/3] w-full rounded-xl lg:w-[26rem] xl:w-[30rem]" />
          ) : (
            <div className="aspect-[5/3] w-full overflow-hidden rounded-xl border border-border bg-surface-2 lg:w-[26rem] xl:w-[30rem]">
              <ThemedArt
                src={CORE_ART}
                alt=""
                loading="eager"
                className="h-full w-full object-contain"
              />
            </div>
          )
        }
        paddingBottom="pb-6"
      >
        {/* State, then controls — the order an operator asks those questions
            in. Both in the LEFT column now that the right one is the picture. */}
        <div className="flex flex-col gap-4">
          {chips}
          {actions}
        </div>
      </HeroSection>

      <div className="container space-y-6 pb-16">{children}</div>
    </div>
  );
}

export default function SystemUpdatePage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const {
    licenseVerified,
    fetchProductInfo,
    updateData,
    isUpdating,
    isUpdateChecking,
    checkForUpdates,
    updateSystem,
    productId,
    productVersion,
    productName,
    activateLicense,
    lastCheckedAt,
    productInfoError,
    updateError,
    lastInstall,
  } = useSystemUpdateStore();

  /*
   * THE STATE SLICES, NOT THE GETTERS — and this is a correctness point rather
   * than a style one.
   *
   * `getProductVersions` / `getProductChangelog` are zustand getters: one stable
   * reference for the life of the store, which makes them inert BOTH as a
   * subscription and as a memo dependency. A `useMemo` keyed on the getter never
   * recomputes, so the release rail would stay empty for the whole session while
   * the data sat in the store one property away. Reading `data` and
   * `productData` directly gives the memo something that actually changes when
   * either fetch lands, and it is also the only spelling the exhaustive-deps
   * rule can verify.
   */
  const {
    data: patchNotesManifest,
    productData: patchNotesProductData,
    fetchPatchNotes,
    fetchProductPatchNotes,
  } = usePatchNotesStore();

  const patchNotesType = useMemo(
    () => getPatchNotesType(productName || "bicrypto"),
    [productName]
  );

  const productInfoFetchedRef = useRef(false);
  useEffect(() => {
    if (productInfoFetchedRef.current) return;
    productInfoFetchedRef.current = true;
    fetchProductInfo();
  }, [fetchProductInfo]);

  // Which versions exist, across every product (~25 KB, no prose).
  const patchNotesFetchedRef = useRef(false);
  useEffect(() => {
    if (patchNotesFetchedRef.current) return;
    patchNotesFetchedRef.current = true;
    fetchPatchNotes();
  }, [fetchPatchNotes]);

  /*
   * The changelog BODIES for this product specifically. The manifest above
   * deliberately carries no `content` — it used to, and that is why this screen
   * downloaded 2 MB of every product's release history to render one changelog.
   * Without this call the release panel has nothing but version numbers.
   *
   * `notesPending` exists because `isLoading` ON THE STORE IS THE WRONG FLAG:
   * it belongs to `fetchPatchNotes` (the manifest), and `fetchProductPatchNotes`
   * never touches it. So the panel's spinner stopped the moment the 25 KB
   * manifest landed, while the prose it was waiting for was still in flight, and
   * the reader was shown "No release notes were published for this version" for
   * a version that had them.
   */
  const productNotesFetchedRef = useRef<string | null>(null);
  const [notesPending, setNotesPending] = useState(true);
  useEffect(() => {
    if (!patchNotesType) return;
    if (productNotesFetchedRef.current === patchNotesType) return;
    productNotesFetchedRef.current = patchNotesType;
    setNotesPending(true);
    fetchProductPatchNotes(patchNotesType).finally(() => setNotesPending(false));
  }, [patchNotesType, fetchProductPatchNotes]);

  /*
   * ONE CHECK PER (product, installed version), and it replaces two effects and
   * two refs that raced.
   *
   * The pair that was here set a boolean before checking and then, in a SECOND
   * effect declared after it, cleared that boolean whenever `productVersion`
   * changed. React runs effects in declaration order within a commit, so on the
   * commit where a completed update bumps the version, the guard effect saw the
   * flag still set and skipped, and the reset ran afterwards against a render
   * that never came again — the re-check the pair existed to trigger simply did
   * not fire. (It happened anyway, because `updateSystem` schedules its own
   * `checkForUpdates` a second later. Two mechanisms for one job, one of them
   * broken, is how the broken one survives.)
   *
   * A signature ref has no ordering to get wrong: the check runs when the pair
   * it is keyed on differs from the pair it last ran for, whichever effect
   * changed it.
   */
  const checkedSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (!productId || !productVersion || !licenseVerified) return;
    const signature = `${productId}@${productVersion}`;
    if (checkedSignatureRef.current === signature) return;
    checkedSignatureRef.current = signature;
    checkForUpdates();
  }, [productId, productVersion, licenseVerified, checkForUpdates]);

  const hasUpdate = Boolean(updateData?.status && updateData?.update_id);
  const pendingUpdates = updateData?.pendingUpdates ?? [];
  const isSequential = pendingUpdates.length > 1;

  /*
   * "NO UPDATE" AND "COULD NOT ASK" ARE DIFFERENT ANSWERS, and this page used
   * to paint them the same green.
   *
   * `checkUpdate` returns `status: false` for three unrelated reasons — no
   * purchase code on the box, the licence server confirming the product is
   * current, and a network failure swallowed by the catch at the bottom — and
   * it has separated them with `checkFailed` since the bulk updater needed the
   * distinction. Nothing on this screen read the field. All three rendered a
   * success tick over "You're Up to Date!", with the failure sentence printed
   * underneath it as the explanation of the good news.
   *
   * The store's own `$fetch` failure branch sets the same flag now, so a
   * backend that never answered lands here too rather than in the green state.
   */
  const checkFailed = Boolean(updateData?.checkFailed);
  const hasCheckRun = lastCheckedAt !== null;

  /** Newest first. The endpoint sorts already, but a rail that silently trusts
      an upstream order is one catalogue edit away from listing v6.0.0 first. */
  const allVersions = useMemo(() => {
    /* The per-product response first, then the manifest — same precedence the
       store's own getter applies. The manifest lists the same versions WITHOUT
       their bodies, so the rail can draw from it while the prose is in flight. */
    const versions =
      patchNotesProductData[patchNotesType]?.versions ??
      patchNotesManifest?.extensions[patchNotesType]?.versions ??
      [];
    return [...versions].sort((a, b) => compareVersions(b.version, a.version));
  }, [patchNotesType, patchNotesManifest, patchNotesProductData]);

  /**
   * The version the updater is offering, or null. Hoisted out of the memo below
   * rather than read inside it: the React Compiler infers a closure over the
   * whole `updateData` object and then refuses to preserve a memo whose declared
   * dependency is only `updateData?.version`.
   */
  const offeredUpdateVersion: string | null =
    hasUpdate && updateData?.version ? updateData.version : null;

  /** What the rail opens on: the version you are being offered, when the
      catalogue has notes for it — that is the document you need before pressing
      Install — and otherwise the newest published release. */
  const defaultVersion = useMemo(() => {
    if (!allVersions.length) return null;
    if (offeredUpdateVersion) {
      const match = allVersions.find((v) => v.version === offeredUpdateVersion);
      if (match) return match.version;
    }
    return allVersions[0].version;
  }, [allVersions, offeredUpdateVersion]);

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const activeVersion = selectedVersion ?? defaultVersion;

  /*
   * WHICH VERSION IS UNFOLDED, not a boolean.
   *
   * A boolean would need an effect to reset it when the rail selection changes,
   * and that effect would commit one frame with the previous note's expanded
   * state applied to the new note. Storing the VERSION makes the reset fall out
   * of the comparison — pick another release and it is folded again, with no
   * effect, no ordering and no intermediate frame.
   */
  const [expandedNotesVersion, setExpandedNotesVersion] = useState<
    string | null
  >(null);
  const expanded =
    activeVersion !== null && expandedNotesVersion === activeVersion;

  /*
   * THE CATALOGUE AND THE UPDATER CAN DISAGREE, AND ON A LIVE INSTALL THEY DO.
   *
   * The update check answers from the licence server behind a ~10-minute cache;
   * the published notes come from the docs host with its own. Neither number is
   * wrong — they answer "what can I install right now" and "what has been
   * released". Said nothing, the page looks broken: the release list advertises
   * a version the update panel has never heard of.
   */
  const catalogueLatest = allVersions[0]?.version || null;
  const offeredVersion = hasUpdate ? updateData.version : productVersion;
  const catalogueIsAhead =
    catalogueLatest !== null &&
    Boolean(offeredVersion) &&
    compareVersions(catalogueLatest, offeredVersion) > 0;

  const changelogFor = (version?: string | null): string | null => {
    if (version) {
      /* Prose lives in the per-product cache only — the manifest deliberately
         carries none, which is what stopped this screen downloading 2 MB of
         every product's release history to render one changelog. */
      const remote =
        patchNotesProductData[patchNotesType]?.versions.find(
          (v) => v.version === version
        )?.content ?? null;
      if (remote) return remote;
      /* The updater ships its own copy of the notes for the version it is
         offering, and it is the only source that has them when the docs host is
         down. Only ever used for THAT version — pasting it under a v5.0.0 entry
         would caption the wrong release. */
      if (hasUpdate && version === updateData.version && updateData.changelog) {
        return updateData.changelog;
      }
    }
    return null;
  };

  // ==========================================================================
  // BACKEND UNREACHABLE
  // ==========================================================================
  /*
   * A STATE THAT COULD NOT BE REACHED BEFORE, because nothing detected it.
   *
   * `fetchProductInfo` used to `console.error` on failure and return, leaving
   * `productVersion` at "" — which is also its value before the first request.
   * The pending branch below tests exactly that, so a backend that is down,
   * restarting, or running from a directory where `package.json` does not
   * resolve rendered as a skeleton FOREVER: no message, no retry, no way to
   * tell it apart from a slow network. See `productInfoError` in the store.
   */
  if (productInfoError && !productVersion) {
    return (
      <UpdateConsoleFrame
        /* NOT `productName` — the request that would have supplied it is the
           one that failed, so the store still holds its `"bicrypto"` default
           and the `<h1>` would render a lowercase internal key. */
        title={t("system_updates")}
        description={t("manage_your_platform_updates_and_system")}
      >
        <Card tone="destructive" padding="lg">
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="font-semibold">
                  {t("this_install_could_not_be_identified")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {productInfoError}
                </p>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("until_the_backend_can_report_a")}
              </p>
              <Button
                variant="outline"
                size="sm"
                tone="destructive"
                onClick={() => fetchProductInfo()}
              >
                <RefreshCw className="h-4 w-4" />
                {tCommon("retry")}
              </Button>
            </div>
          </div>
        </Card>
      </UpdateConsoleFrame>
    );
  }

  // ==========================================================================
  // PENDING
  // ==========================================================================
  if (!productVersion) {
    return (
      /*
       * THE PENDING PAGE, BUILT FROM THE PAGE IT BECOMES.
       *
       * What was here was a fourth copy of this route's layout, and it measured
       * things it did not stand in for: the Back button — a literal in this
       * file, knowable before any fetch — was an `h-8 w-32` grey box; the title
       * bar was `h-10` against a heading whose line box is 32px at the small
       * breakpoint; and the three `h-40` cards below it corresponded to nothing,
       * since neither the licensed nor the unlicensed view renders a three-up
       * grid there.
       *
       * Now it is the SAME `HeroSection`, with `SkeletonText` inside the real
       * `<h1>` and `<p>`, so the heights are produced by the type that will
       * render the real strings.
       */
      <UpdateConsoleFrame pending>
        <Card padding="lg">
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-40 rounded-md" />
            <SkeletonBlock className="h-4 w-full max-w-xl rounded-md" />
            <SkeletonBlock className="h-4 w-full max-w-md rounded-md" />
          </div>
        </Card>
      </UpdateConsoleFrame>
    );
  }

  // ==========================================================================
  // UNLICENSED
  // ==========================================================================
  if (!licenseVerified) {
    return (
      <UnlicensedView
        productVersion={productVersion}
        activateLicense={activateLicense}
      />
    );
  }

  // ==========================================================================
  // LICENSED
  // ==========================================================================
  return (
    <UpdateConsoleFrame
      title={productName || tCommon("bicrypto")}
      description={t("manage_your_platform_updates_and_system")}
      /*
       * THE STATUS ROW REPLACES THREE `StatsCard` TILES.
       *
       * The Overview tab opened with a `grid-cols-3` of KPI tiles reading
       * License Status / Current Version / Update Status — and all three
       * restated something already on screen ~200px above them: the "Licensed"
       * badge, the version badge and the "Update Available" badge. Three
       * bordered ~96px surfaces, two of them tinted, to say nothing new.
       *
       * `layout/heading-stats.tsx` argues this out — "in a heading they are
       * large boxes competing with the `<h1>` directly above them" — but its
       * `stats` rail is for FIGURES and these are STATES. A state is a chip.
       *
       * Tones are load-bearing rather than decorative: the licence and the
       * update are the two things that change what an operator does here, and
       * each says its verdict IN WORDS as well as in colour (R8).
       */
      chips={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" appearance="soft">
            <CheckCircle2 className="h-3 w-3" />
            Licensed
          </Badge>
          <Badge tone="neutral" appearance="outline" className="font-mono">
            v{productVersion}
          </Badge>
          {/* The badge this replaces carried `animate-pulse` — a two-second
              infinite loop on a heading chip that is not expressing a state
              CHANGE, which is what R12's budget is about; and the Updates tab
              trigger ran the same pulse on its own dot, so two elements throbbed
              out of phase for one fact. */}
          {hasUpdate ? (
            <Badge tone="warning" appearance="soft">
              <Download className="h-3 w-3" />
              {isSequential
                ? t("updates_pending", { length: pendingUpdates.length })
                : t("update_available")}
            </Badge>
          ) : null}
          {checkFailed ? (
            <Badge tone="destructive" appearance="soft">
              <ShieldAlert className="h-3 w-3" />
              {t("check_failed")}
            </Badge>
          ) : null}
        </div>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* THE ONE LOUD THING, AND ONLY WHEN IT IS TRUE. R2 spends the accent
              on what is interactive or the one figure that matters; here they
              are the same object. On an install with nothing to do, the loudest
              control on the page is an outlined "Check for Updates". */}
          {hasUpdate ? (
            <Button tone="warning" onClick={updateSystem} loading={isUpdating}>
              {isUpdating ? (
                `${tCommon("updating")}…`
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t("install_v")}{updateData.version}
                </>
              )}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={checkForUpdates}
            loading={isUpdateChecking}
          >
            {isUpdateChecking ? (
              `${tCommon("checking")}…`
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {tCommon("check_for_updates")}
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              MashDiv.com
            </a>
          </Button>
        </div>
      }
    >
      {/*
        THE INSTALL ATTEMPT THAT FAILED — previously invisible in every form.
        `updateSystem` wrote the reason into `updateData.message` while leaving
        `status` true, so the panel carried on offering the update and the reason
        was drawn nowhere; the request runs `silent: true`, so there was no toast
        either. Pressing Update Now on a box whose licence had lapsed looked
        exactly like pressing it and nothing happening.
      */}
      {updateError ? (
        <Alert tone="destructive" appearance="soft">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t("the_update_did_not_install")}</strong> {updateError}
          </AlertDescription>
        </Alert>
      ) : null}

      {/*
        THE CONFIRMATION, WHICH IS WHY `lastInstall` IS NOT PART OF `updateData`.
        A completed install bumps `productVersion`, which re-triggers the update
        check, which replaces `updateData` wholesale — so the one sentence
        confirming that the most consequential button on the page did anything
        was overwritten about a second after it appeared.
      */}
      {lastInstall ? (
        <Alert tone="success" appearance="soft">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong className="font-mono tabular-nums">
              v{lastInstall.version}
            </strong>{" "}
            installed
            {lastInstall.filesUpdated > 0
              ? t("files_were_replaced", { filesUpdated: String(lastInstall.filesUpdated) })
              : "."}
            {hasUpdate
              ? t("there_is_another_release_in_the_queue_below")
              : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Backup first, and only when there is something to install — a warning
          that is present on every visit is wallpaper by the second one. */}
      {hasUpdate ? (
        <Alert tone="warning" appearance="soft">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("please_backup_your_database_and_script")}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ---- RELEASE STATE ---- */}
      <Card>
        <CardHeader>
          {/*
            FOUR FACES, AND THE FOURTH IS THE ONE THAT WAS MISSING.

            `checkFailed` first, because it invalidates the other three; then
            "an update is waiting"; then the genuine all-clear; and finally the
            state before any check has completed, which used to be painted as
            the all-clear — a green tick and "You're Up to Date!" rendered
            against `updateData`'s zero value, before the licence server had
            been asked anything at all.
          */}
          <PanelTitle
            icon={
              checkFailed
                ? ShieldAlert
                : !hasCheckRun
                  ? RefreshCw
                  : hasUpdate
                    ? Download
                    : CheckCircle2
            }
            tone={
              checkFailed
                ? "destructive"
                : !hasCheckRun
                  ? "neutral"
                  : hasUpdate
                    ? "warning"
                    : "success"
            }
          >
            {checkFailed
              ? t("the_update_check_did_not_complete")
              : !hasCheckRun
                ? `${tCommon("checking")}…`
                : hasUpdate
                  ? t("update_available")
                  : t("youre_up_to_date")}
          </PanelTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/*
            THE FAILURE REASON, IN THE PANEL THAT MAKES THE CLAIM.

            This is the whole point of reading `checkFailed`. The backend already
            knows which of the three it was — no licence file for this product,
            the licence server refusing the connection, a timeout — and says so
            in `failureReason`. Without it the operator is told the install is
            current by a screen that never managed to ask.
          */}
          {checkFailed ? (
            <p className="text-sm text-muted-foreground">
              {updateData.failureReason ||
                t("the_licence_server_could_not_be")}
            </p>
          ) : null}

          {/*
            STACKED, NOT `DataRow`.

            `DataRow` is `justify-between` — right for the narrow rail it was
            written for, wrong here: across a four-column grid it pushes each
            label to the far left of its cell and each value to the far right,
            so "Current Version" and "6.6.2" end up 200px apart with a leader of
            empty space between them, and the eye pairs each value with the
            NEXT label instead of its own. Stacked, the pair is unambiguous
            whatever the column width, and it is a real `<dl>`.
          */}
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">
                {tCommon("current_version")}
              </dt>
              <dd className="mt-1 font-mono text-sm tabular-nums">
                {productVersion}
              </dd>
            </div>
            {hasUpdate ? (
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("next_update")}
                </dt>
                <dd className="mt-1 font-mono text-sm tabular-nums text-warning">
                  {updateData.version}
                </dd>
              </div>
            ) : null}
            {/*
              ONLY WHEN IT IS ACTUALLY AHEAD OF THE INSTALL.

              This install reports 6.6.2 while the licence server's
              `latestVersion` is 6.6.1 — the box is running a build newer than
              the catalogue, which is ordinary on a development install and
              happens in the field whenever a hotfix ships out of band. Tested
              for INEQUALITY, as it first was, the panel printed "Current
              Version 6.6.2 / Latest Version 6.6.1" side by side, which reads as
              a rendering fault rather than as a fact.

              It is also suppressed after a failed check, where `latestVersion`
              is just the installed version echoed back — a "latest release"
              claim from a screen that never managed to ask.
            */}
            {!checkFailed &&
            updateData.latestVersion &&
            compareVersions(updateData.latestVersion, productVersion) > 0 ? (
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("latest_version")}
                </dt>
                <dd className="mt-1 font-mono text-sm tabular-nums">
                  {updateData.latestVersion}
                </dd>
              </div>
            ) : null}
            {/*
              WHEN THE VERDICT ABOVE WAS REACHED.

              The flags come through a ~10-minute cache on the licence server, so
              "up to date" regularly means "nobody has asked recently". A verdict
              with no timestamp cannot be argued with. Rendered from a value that
              is only ever set in the browser, after a request that only runs
              there, so there is no server render for it to disagree with.
            */}
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">
                {t("last_checked")}
              </dt>
              <dd className="mt-1 text-sm tabular-nums text-muted-foreground">
                {hasCheckRun
                  ? new Date(lastCheckedAt as number).toLocaleTimeString()
                  : "—"}
              </dd>
            </div>
          </dl>

          {/*
            THE QUEUE, ONCE.

            A sequential run used to be announced FIVE times: a header badge, a
            superscript count on the tab, an info alert, the card description,
            and this list. Four of those said only how many; this one says which,
            and in what order, which is the only form of the fact that changes
            what the operator does next.
          */}
          {isSequential ? (
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2">
                <ListOrdered
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <p className="text-sm font-medium">
                  {pendingUpdates.length} releases must be installed in order
                </p>
              </div>
              <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                <li className="rounded-md bg-surface-3 px-2 py-1 font-mono text-xs tabular-nums text-muted-foreground">
                  v{productVersion}
                </li>
                {pendingUpdates.map((update, index) => (
                  <li key={update.version} className="flex items-center gap-1.5">
                    <ArrowRight
                      className="h-3 w-3 text-muted-foreground"
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 font-mono text-xs tabular-nums",
                        index === 0
                          ? "bg-warning/15 font-medium text-warning-ink"
                          : "bg-surface-3 text-muted-foreground"
                      )}
                    >
                      v{update.version}
                    </span>
                    {index === 0 ? (
                      <span className="text-xs text-muted-foreground">next</span>
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("each_install_is_applied_on_its")}
              </p>
            </div>
          ) : null}

        </CardContent>
      </Card>

      {/* ---- RELEASES ---- */}
      {/*
        "UPDATES" AND "CHANGELOG" WERE ONE THING WEARING TWO NAMES.

        The Updates tab devoted two-thirds of its width to "What's New in X" and
        the Changelog tab was a version picker over the same `getProductChangelog`
        call — the same document, fetched once, rendered twice, in two panels of
        different sizes, behind two tabs. Merged, there is exactly one subject
        left on this page, so the tab strip goes too: a tab bar whose tabs are
        "the thing" and "the same thing again" is a control that does nothing,
        and it hid the release notes behind a click on the one screen where
        reading them BEFORE pressing Install is the entire point.

        Both panels were `ScrollArea` boxes at a fixed `h-[400px]` / `h-[500px]`,
        so the document the page exists to show was clipped mid-heading with the
        rest of the viewport empty beneath it. It is in page flow now.
      */}
      {allVersions.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <Card
            padding="none"
            className="lg:sticky lg:top-header-clear lg:self-start"
          >
            {/* The installed build sits ABOVE the list rather than in it,
                because it is frequently not in the list — see
                `lib/version-compare.ts`. */}
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tCommon("current_version")}
              </p>
              <p className="mt-0.5 font-mono text-sm tabular-nums">
                v{productVersion}
              </p>
            </div>
            <div className="py-1.5">
              <ReleaseRail
                versions={allVersions}
                installedVersion={productVersion}
                availableVersion={hasUpdate ? updateData.version : null}
                selected={activeVersion}
                onSelect={setSelectedVersion}
              />
            </div>
          </Card>

          <Card>
            {/*
              A THIN HEADER, BECAUSE THE DOCUMENT HAS ITS OWN. The published
              notes open with their own title, date and tag line, and the
              `metadata` object is parsed out of that same front matter — so
              every field a rich header could show is a second copy of the first
              two lines of the document underneath it. What is left is which
              entry of the rail you are reading, and the control that acts on it.
            */}
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="font-mono text-base tabular-nums">
                  v{activeVersion}
                </CardTitle>
                {/* The install control follows the SELECTION, so it appears only
                    while you are reading the notes for the version you are
                    actually being offered — pressing Install under a v5.0.0 page
                    would have installed something else. */}
                {hasUpdate && activeVersion === updateData.version ? (
                  <Button
                    size="sm"
                    tone="warning"
                    onClick={updateSystem}
                    loading={isUpdating}
                  >
                    {isUpdating ? (
                      `${t("installing_update")}…`
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        {t("install_update")}
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const changelog = changelogFor(activeVersion);
                if (notesPending && !changelog) {
                  return (
                    <div className="space-y-3 py-2">
                      <SkeletonBlock className="h-5 w-56 rounded-md" />
                      <SkeletonBlock className="h-4 w-full rounded-md" />
                      <SkeletonBlock className="h-4 w-11/12 rounded-md" />
                      <SkeletonBlock className="h-4 w-4/5 rounded-md" />
                    </div>
                  );
                }
                if (!changelog) {
                  return (
                    <p className="py-6 text-sm text-muted-foreground">
                      {t("no_release_notes_were_published_for_this_version")}
                    </p>
                  );
                }

                const body = isMarkdownContent(changelog) ? (
                  <MarkdownRenderer content={changelog} />
                ) : (
                  <div className="prose max-w-none dark:prose-invert">
                    {changelog}
                  </div>
                );

                /*
                 * A CHARACTER COUNT, NOT A DOM MEASUREMENT.
                 *
                 * Measuring the rendered height needs a ref, a layout effect
                 * and a re-render, and it has to re-run on every resize and
                 * every font swap — for a decision whose only outcome is
                 * whether to offer a button. 6,000 characters of markdown is
                 * comfortably past 42rem at any width this card is rendered at,
                 * so a note under it is never folded and a note over it always
                 * has more to show. Being approximate costs a short note an
                 * unnecessary "Read the full release notes" it can satisfy in
                 * one click; being exact costs a layout pass per keystroke of
                 * window resize.
                 */
                const isLong = changelog.length > 6000;
                if (!isLong) return body;

                return (
                  <div>
                    {/*
                      FOLDED, NOT CLIPPED — and the difference is the whole
                      argument against what was here before.

                      A CORE release note is not an add-on's. Measured against
                      the published v6.6.2: 99,952 characters, which renders to
                      roughly 28,000px and made the whole page 29,422px tall.
                      That is not a document anyone reads in flow, and it buries
                      the rail, the reconciliation line and the footer under
                      thirty screens of prose.

                      But the answer is not the `ScrollArea h-[400px]` this
                      replaced. That let ~13% of the text through a fixed
                      letterbox with the rest of the viewport empty beside it,
                      and it did so on EVERY note, including the short ones. A
                      fold shows a screenful and a half, says how much more
                      there is, and opens to the entire document in page flow —
                      where Ctrl+F, print and text selection all work, none of
                      which they do inside a virtualised scroll box.
                    */}
                    <div
                      className={cn(
                        "relative",
                        !expanded && "max-h-[42rem] overflow-hidden"
                      )}
                    >
                      {body}
                      {!expanded ? (
                        /* The fade is what stops the clamp reading as a
                           rendering fault — a hard cut mid-sentence looks like
                           the page failed, a fade looks like more text. */
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-card"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="mt-4 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedNotesVersion(
                            expanded ? null : activeVersion
                          )
                        }
                      >
                        {expanded
                          ? t("collapse_release_notes")
                          : t("read_the_full_release_notes")}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card variant="dashed" padding="lg">
          <div className="flex flex-col items-center py-10 text-center">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
            <h3 className="font-semibold">{t("no_changelog_available")}</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {notesPending
                ? `${t("fetching_the_published_release_history")}…`
                : t("the_release_catalogue_could_not_be")}
            </p>
          </div>
        </Card>
      )}

      {/* The reconciliation line, last, because it explains a discrepancy
          between two things the operator has now read. */}
      {catalogueIsAhead ? (
        <p className="text-sm text-muted-foreground">
          Release notes are published up to{" "}
          <span className="font-mono tabular-nums">v{catalogueLatest}</span>,
          while the updater currently offers{" "}
          <span className="font-mono tabular-nums">v{offeredVersion}</span>. The
          two are served by different caches — re-check for updates if the newer
          build should already be available to you.
        </p>
      ) : null}

      {/* ---- FOOTER ---- */}
      {/*
        WHAT IS LEFT OF "QUICK LINKS", WHICH WAS A CARD HOLDING THREE BUTTONS.

        One of the three was Extensions — a page the admin nav already links, so
        the panel spent a third of itself, and a full bordered surface, on
        navigation that was one click away either way. The two that remain leave
        the product entirely, which is the only kind of link this page can offer
        that the chrome does not. They are a footer row, not a panel: a heading,
        a card and a grid to hold two outbound links is more structure than two
        links can justify.

        The product id joins them because it is the one identifier a support
        conversation always asks for, and it had no home on the page at all.
      */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Hash className="h-3.5 w-3.5" aria-hidden />
          {tCommon("product_id")}
          <span className="font-mono tabular-nums text-foreground">
            {productId || "—"}
          </span>
        </span>
        <Button variant="link" size="sm" className="px-0" asChild>
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            <LifeBuoy className="h-4 w-4" />
            {t("support_portal")}
          </a>
        </Button>
        <Button variant="link" size="sm" className="px-0" asChild>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4" />
            {tCommon("documentation")}
          </a>
        </Button>
      </div>
    </UpdateConsoleFrame>
  );
}

// ============================================================================
// UNLICENSED
// ============================================================================
/**
 * WHAT CAME OUT OF THIS VIEW, AND WHY.
 *
 * A "Platform Features" grid of six cards — Spot Trading, Secure Wallets, P2P
 * Trading, Staking, API Access, Real-time Data — each with a hardcoded English
 * title and sentence, none of which went through `next-intl`, so the one screen
 * an operator in another locale reaches before they can use the product was the
 * one screen guaranteed to be in English.
 *
 * And it was WRONG on its own terms: P2P and Staking are separately licensed
 * add-ons, not core. The page advertised, as reasons to activate this licence,
 * two products this licence does not include.
 *
 * What replaces it is what a purchase code actually buys, which the file already
 * had translated strings for and was printing in six-point grey beside the form.
 */
function UnlicensedView({
  productVersion,
  activateLicense,
}: {
  productVersion: string;
  activateLicense: (
    purchaseCode: string,
    envatoUsername: string
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const [purchaseCode, setPurchaseCode] = useState("");
  const [envatoUsername, setEnvatoUsername] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  /*
   * A FAILED ACTIVATION USED TO PRODUCE NOTHING AT ALL.
   *
   * `activateLicense` wrote the reason into `updateData.message` — a field this
   * view does not render — and the underlying `$fetch` runs `silent: true`,
   * which suppresses the error toast as well. So a mistyped code, a code already
   * bound to another machine, or a licence server refusing the connection all
   * looked identical: the button stopped spinning and the form sat there. The
   * store returns the outcome now; this renders it.
   */
  const handleActivate = async () => {
    setIsActivating(true);
    setActivationError(null);
    const result = await activateLicense(purchaseCode.trim(), envatoUsername.trim());
    if (!result.ok) setActivationError(result.error ?? "Activation failed.");
    setIsActivating(false);
  };

  return (
    <UpdateConsoleFrame
      title={t("complete_cryptocurrency_exchange_platform")}
      description={t("a_powerful_feature_rich_cryptocurrency_trading")}
      chips={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning" appearance="soft">
            <Key className="h-3 w-3" />
            {tCommon("license_required")}
          </Badge>
          <Badge tone="neutral" appearance="outline" className="font-mono">
            v{productVersion}
          </Badge>
        </div>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
              {t("view_on_envato")}
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      }
    >
      <Card padding="lg">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold leading-tight tracking-tight">
                {t("activate_your_license")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("enter_your_envato_purchase_code_to")}
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                {t("automatic_updates")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                {t("premium_support")}
              </li>
            </ul>
            {/*
              THE OTHER ACTIVATION METHOD, WHICH THIS FORM DOES NOT HAVE.
              `/admin/system/license` accepts a `.lic` FILE as well as a code —
              the path a managed or air-gapped install has to use — and this
              screen was a dead end for anyone holding one. A `Link` rather than
              `router.push` so it keeps the locale and can be middle-clicked.
            */}
            <p className="text-sm text-muted-foreground">
              Holding a licence <em>file</em> instead of a code?{" "}
              <Link
                href="/admin/system/license"
                className="font-medium text-foreground underline underline-offset-4"
              >
                {t("use_the_full_activation_page")}
              </Link>
              .
            </p>
          </div>

          <div className="space-y-4">
            {activationError ? (
              <Alert tone="destructive" appearance="soft">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{activationError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="purchase-code" className="text-sm font-medium">
                {t("purchase_code")}
              </label>
              <Input
                id="purchase-code"
                value={purchaseCode}
                onChange={(e) => setPurchaseCode(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="license-email" className="text-sm font-medium">
                {tCommon("email")}{" "}
                <span className="text-muted-foreground">
                  ({tCommon("optional")})
                </span>
              </label>
              <Input
                id="license-email"
                type="email"
                value={envatoUsername}
                onChange={(e) => setEnvatoUsername(e.target.value)}
                placeholder={tCommon("enter_your_email_address")}
                autoComplete="email"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleActivate}
              loading={isActivating}
              /* Whitespace-only input is not a code. Trimmed here as well as in
                 the handler so the button does not offer to submit one. */
              disabled={!purchaseCode.trim()}
            >
              {isActivating ? (
                tCommon("enable")
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  {tCommon("activate_license")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Neutral, and stated once: an unlicensed install still runs. The old
          view implied the opposite by wrapping the form in a features pitch. */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {t("the_platform_keeps_running_without_a")}
        </AlertDescription>
      </Alert>
    </UpdateConsoleFrame>
  );
}
