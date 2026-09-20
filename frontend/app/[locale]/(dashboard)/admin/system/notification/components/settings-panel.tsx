"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { m } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Settings, RefreshCw, CheckCircle2, XCircle, Mail, MessageSquare, Smartphone, Inbox, Database, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface SettingsData {
  timestamp: string;
  channels: {
    [key: string]: {
      enabled: boolean;
      provider?: string;
      from?: string;
      description?: string;
      configured?: boolean;
    };
  };
  providers: {
    [key: string]: {
      configured: boolean;
    };
  };
  features: {
    idempotency: {
      enabled: boolean;
      ttl: string;
    };
    userPreferences: {
      enabled: boolean;
      cacheTTL: string;
    };
    deliveryTracking: {
      enabled: boolean;
      ttl: string;
    };
    priorityLevels: string[];
    notificationTypes: string[];
  };
}

export function SettingsPanel() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  /**
   * `true`, not `false`, and that one character is a loading/empty bug of its
   * own.
   *
   * `fetchSettings` runs from a `useEffect`, which fires AFTER the first paint —
   * so on the initial render the component claimed "not loading, no data", the
   * only combination that means "there are no settings". The empty card
   * therefore painted for a frame on every mount, before any request had been
   * made. Starting at `true` states the truth: a fetch is about to run.
   */
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/notification/settings",
        silent: true,
      });

      if (error) {
        toast.error(t("failed_to_fetch_settings"));
      } else {
        setSettingsData(data);
      }
    } catch (err) {
      console.error("Settings fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const channelIcons: Record<string, any> = {
    inApp: { icon: Inbox, color: "text-primary", bgColor: "bg-primary/10" },
    email: { icon: Mail, color: "text-success", bgColor: "bg-success/10" },
    sms: { icon: MessageSquare, color: "text-warning", bgColor: "bg-warning/10" },
    push: { icon: Smartphone, color: "text-primary", bgColor: "bg-primary/10" },
  };

  /**
   * FOUR CARDS OF STATIC CHROME WERE BEING WITHHELD BY ONE `{settingsData &&}`.
   * ==========================================================================
   *
   * This panel is a read-only description of the notification service, and
   * almost all of it is written down in this file rather than in the response:
   * four card titles and descriptions, the three feature rows (Idempotency /
   * User Preferences / Delivery Tracking, each with its own icon and its own
   * sentence), the two capability headings, every border and every 16px of
   * padding. The endpoint supplies about a dozen booleans, three TTL strings
   * and two lists.
   *
   * All of it hung off a single `settingsData &&` gate, so the pending state
   * was the header card alone — roughly 120px — and the resolved state is over
   * 1200px. The scanner does not flag that gate (it tests data presence, not
   * `!isLoading`), which is exactly why it is worth calling out: the SHAPE of
   * the defect is the same one `hidden-while-loading` describes, and it was the
   * larger instance of it on this page.
   *
   * Everything below now renders in both states. Only the values wait.
   */
  const pending = isLoading && !settingsData;

  /**
   * Resolved, and the request produced nothing. Named rather than written
   * `!settingsData && !isLoading &&` inline, both because that spelling is the
   * `hidden-while-loading` shape and because an empty answer and a late answer
   * are different things that were sharing one expression.
   */
  const showEmptyState = !isLoading && !settingsData;

  /**
   * The four description cards. True while pending — that is the whole point of
   * this pass — and true once the settings land, but NOT in the third state,
   * where the request came back with nothing.
   *
   * That third state matters because every card here falls back to "Disabled" /
   * "Not Configured" on a missing value. Rendering them against no data at all
   * would report a healthy install as one with every channel off and every
   * provider unconfigured, next to a card explaining that nothing loaded. The
   * gate keeps that case exactly as it was: the empty card, alone.
   */
  const showSections = pending || Boolean(settingsData);

  const features = settingsData?.features;

  /**
   * Rows to draw while the answer is in flight.
   *
   * The CHANNEL keys are knowable — they are the same four this file already
   * hardcodes in `channelIcons` above, and the service has no others — so a
   * pending channel row shows its real name and its real icon and waits only on
   * whether it is enabled and who delivers it.
   *
   * PROVIDER NAMES are not knowable in the same way — which integrations an
   * install exposes is the endpoint's business — so the six rows here are a
   * COUNT reservation (SKELETONS.md, "Lists and grids": draw a fixed number and
   * accept that it settles) and the name inside each one is a placeholder
   * rather than an invented "smtp" that would read as a real answer. Six
   * because that is what `settings.get.ts` enumerates today — sendgrid,
   * nodemailer, twilio, msg91, vapid, fcm — and the grid is `md:grid-cols-2`,
   * so being wrong by one costs half a row rather than a whole one.
   */
  type ChannelConfig = SettingsData["channels"][string];
  type ProviderStatus = SettingsData["providers"][string];

  const channelRows: Array<[string, Partial<ChannelConfig>]> = settingsData
    ? Object.entries(settingsData.channels)
    : Object.keys(channelIcons).map((key): [string, Partial<ChannelConfig>] => [
        key,
        {},
      ]);

  const providerRows: Array<[string, Partial<ProviderStatus>]> = settingsData
    ? Object.entries(settingsData.providers)
    : Array.from(
        { length: 6 },
        (_, index): [string, Partial<ProviderStatus>] => [`pending-${index}`, {}]
      );

  return (
    <div className="space-y-6">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t("service_configuration")}
                </CardTitle>
                <CardDescription>
                  {t("current_notification_service_settings_and_configur")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchSettings}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </m.div>

      {showSections && (
        <>
          {/* Channel Configuration */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("channel_configuration")}</CardTitle>
                <CardDescription>{t("notification_channel_settings_and_providers")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channelRows.map(([channel, config]) => {
                    const channelInfo = channelIcons[channel] || {
                      icon: Settings,
                      color: "text-subtle-foreground",
                      bgColor: "bg-muted/10",
                    };
                    const Icon = channelInfo.icon;

                    return (
                      <div key={channel} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${channelInfo.bgColor} mt-0.5`}>
                              <Icon className={`h-5 w-5 ${channelInfo.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {/* The channel's NAME is chrome here, not data — the
                                    four keys are declared in this file. Only the
                                    verdict on it waits, inside the chip that will
                                    carry the verdict. The chip's tone stays neutral
                                    while pending because `config.enabled` is
                                    undefined, and a green "Enabled" that flips to
                                    grey is worse than a grey one that turns green. */}
                                <h3 className="font-semibold capitalize">{channel}</h3>
                                <Badge
                                  variant={config.enabled ? "default" : "secondary"}
                                  className={
                                    config.enabled
                                      ? "bg-success/10 text-success-ink hover:bg-success/15"
                                      : ""
                                  }
                                >
                                  <Loadable
                                    loading={pending}
                                    placeholder="Enabled"
                                    radius="rounded-xs"
                                  >
                                    {config.enabled ? tCommon("enabled") : tCommon("disabled")}
                                  </Loadable>
                                </Badge>
                              </div>
                              {/*
                                ONE detail line is reserved, and one is the
                                honest number.

                                The endpoint gives each channel a different
                                subset: `inApp` a description, `email` a
                                provider plus a from address, `sms` a provider,
                                `push` both a description and a provider. So
                                every row resolves to one or two lines and no
                                row resolves to zero — one line is knowable,
                                the second is not. Reserving both (the first
                                shape tried here) over-reserved `inApp` and
                                `sms` by a line each and left the card
                                SHRINKING as the data landed, which is the same
                                defect pointing the other way.

                                The description `<p>` is the one drawn because
                                it is the taller of the two candidates
                                (`text-sm` plus `mb-2`), so what is left to
                                settle is the smaller half.
                              */}
                              {pending || config.description ? (
                                <p className="text-sm text-muted-foreground mb-2">
                                  <Loadable
                                    loading={pending}
                                    placeholder={t("in_app_notifications_via_websocket")}
                                  >
                                    {config.description}
                                  </Loadable>
                                </p>
                              ) : null}
                              <div className="space-y-1 text-sm">
                                {config.provider && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{tCommon("provider")}:</span>
                                    <span className="font-medium">{config.provider}</span>
                                  </div>
                                )}
                                {config.from && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{tCommon("from")}:</span>
                                    <span className="font-medium">{config.from}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </m.div>

          {/* Provider Status */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("provider_status")}</CardTitle>
                <CardDescription>{t("third_party_service_provider_configuration_status")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {providerRows.map(([provider, status]) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        {/* An icon has no text metrics, so this is one of the few
                            places `SkeletonBlock` is the right primitive — sized
                            with the SAME `h-4 w-4` string the two real glyphs
                            carry. It also has to be a third state rather than
                            falling through to `XCircle`: the false branch here is
                            a VERDICT ("not configured"), and painting it before
                            the answer arrives says the install is misconfigured. */}
                        {pending ? (
                          <SkeletonBlock className="h-4 w-4 rounded-full" />
                        ) : status.configured ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium capitalize">
                          {/* WHICH providers exist is a property of the install, so
                              unlike the channel rows the name itself is unknown. */}
                          <Loadable loading={pending} placeholder="sendgrid">
                            {provider}
                          </Loadable>
                        </span>
                      </div>
                      <Badge
                        variant={status.configured ? "default" : "secondary"}
                        className={
                          status.configured
                            ? "bg-success/10 text-success-ink hover:bg-success/15"
                            : ""
                        }
                      >
                        <Loadable
                          loading={pending}
                          placeholder={tCommon("not_configured")}
                          radius="rounded-xs"
                        >
                          {status.configured ? tCommon("configured") : tCommon("not_configured")}
                        </Loadable>
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </m.div>

          {/*
            Features.

            Three rows that are ENTIRELY written down here — icon, name, sentence,
            border — around one boolean and one TTL string each. Nothing about this
            card's height depends on the response, so nothing about it should have
            waited for one.
          */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("service_features")}</CardTitle>
                <CardDescription>{t("enabled_features_and_capabilities")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Idempotency */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Idempotency</span>
                    </div>
                    <Badge
                      variant={features?.idempotency.enabled ? "default" : "secondary"}
                      className={
                        features?.idempotency.enabled
                          ? "bg-success/10 text-success-ink hover:bg-success/15"
                          : ""
                      }
                    >
                      <Loadable loading={pending} placeholder="Enabled" radius="rounded-xs">
                        {features?.idempotency.enabled ? tCommon("enabled") : tCommon("disabled")}
                      </Loadable>
                    </Badge>
                  </div>
                  {/* The sentence is a constant and the TTL is not, so the skeleton
                      goes around the TTL and not around the line. Wrapping the
                      whole `<p>` would have reserved the same box and thrown away
                      the half of it that is readable now. */}
                  <p className="text-sm text-muted-foreground">
                    {t("prevents_duplicate_notifications_ttl")}:{" "}
                    <Loadable loading={pending} placeholder="30 days">
                      {features?.idempotency.ttl}
                    </Loadable>
                  </p>
                </div>

                {/* User Preferences */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("user_preferences")}</span>
                    </div>
                    <Badge
                      variant={features?.userPreferences.enabled ? "default" : "secondary"}
                      className={
                        features?.userPreferences.enabled
                          ? "bg-success/10 text-success-ink hover:bg-success/15"
                          : ""
                      }
                    >
                      <Loadable loading={pending} placeholder="Enabled" radius="rounded-xs">
                        {features?.userPreferences.enabled ? tCommon("enabled") : tCommon("disabled")}
                      </Loadable>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("respects_user_notification_preferences_cache_ttl")}:{" "}
                    <Loadable loading={pending} placeholder="1 hour">
                      {features?.userPreferences.cacheTTL}
                    </Loadable>
                  </p>
                </div>

                {/* Delivery Tracking */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t("delivery_tracking")}</span>
                    </div>
                    <Badge
                      variant={features?.deliveryTracking.enabled ? "default" : "secondary"}
                      className={
                        features?.deliveryTracking.enabled
                          ? "bg-success/10 text-success-ink hover:bg-success/15"
                          : ""
                      }
                    >
                      <Loadable loading={pending} placeholder="Enabled" radius="rounded-xs">
                        {features?.deliveryTracking.enabled ? tCommon("enabled") : tCommon("disabled")}
                      </Loadable>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("tracks_notification_delivery_status_ttl")}:{" "}
                    <Loadable loading={pending} placeholder="30 days">
                      {features?.deliveryTracking.ttl}
                    </Loadable>
                  </p>
                </div>
              </CardContent>
            </Card>
          </m.div>

          {/* System Capabilities */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("system_capabilities")}</CardTitle>
                <CardDescription>{t("available_priority_levels_and_notification_types")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  {/*
                    Both headings are constants; only the chips under them wait,
                    and a pending chip is a real `<Badge>` with a `SkeletonText`
                    inside it — same element, same padding, same border — rather
                    than a `Skeleton` box beside one.

                    THE COUNTS ARE NOT GUESSES HERE. Both lists are literal
                    arrays in `settings.get.ts`: four priority levels and
                    eighteen notification types. This is the case SKELETONS.md
                    calls out as the exception to "lists have no knowable
                    length" — the length IS knowable, it just arrives late. Two
                    of these chip rows wrap to three lines at this card's width,
                    so guessing six instead of eighteen would have left ~60px to
                    settle in a section that is otherwise exact.
                  */}
                  <h3 className="font-medium mb-3">{t("priority_levels")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {pending
                      ? Array.from({ length: 4 }, (_, index) => (
                          <Badge key={index} variant="outline">
                            <SkeletonText chars={5} radius="rounded-xs" />
                          </Badge>
                        ))
                      : (features?.priorityLevels ?? []).map((level) => (
                          <Badge key={level} variant="outline">
                            {level}
                          </Badge>
                        ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">{tCommon("notification_types")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {pending
                      ? /* `chars={7}` is the mean length of the eighteen names
                           (SYSTEM … COPY_TRADING … ECOMMERCE). These are prose,
                           not figures, so the width reserves an average and the
                           row settles sideways — which is the asymmetry
                           `SkeletonText` documents and accepts. */
                        Array.from({ length: 18 }, (_, index) => (
                          <Badge key={index} variant="outline">
                            <SkeletonText chars={7} radius="rounded-xs" />
                          </Badge>
                        ))
                      : (features?.notificationTypes ?? []).map((type) => (
                          <Badge key={type} variant="outline">
                            {type}
                          </Badge>
                        ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </>
      )}

      {showEmptyState && (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{t("no_settings_data_available")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
