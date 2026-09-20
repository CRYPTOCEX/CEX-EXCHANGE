"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsHero } from "./components/settings-hero";

/**
 * Pending state for /gateway/settings.
 *
 * WAS: `space-y-6 container pt-24 pb-12` over an `h-10` bar and two `h-64`
 * blocks.
 *
 * The settled page is `<div className="w-full">` → `<SettingsHero>` →
 * `container mx-auto space-y-6 pb-12 pt-8` → a three-tab `TabsList` with a
 * Save button beside it, then the tab's cards. So the container was hoisted to
 * the root (boxing the full-bleed hero), `pt-24` stood in for `pt-8` — 64px of
 * phantom clearance — and the tab bar, which is entirely static (`General`,
 * `API keys`, `Webhooks` and a Save button), was not drawn at all, so
 * everything below it started ~56px too high.
 *
 * NOW: the imported hero, the real tab bar and Save button, and pending cards.
 */
export default function GatewaySettingsLoading() {
  const tCommon = useTranslations("common");

  return (
    <div className="w-full">
      <SettingsHero />

      <div className="container mx-auto space-y-6 pb-12 pt-8">
        <Tabs value="general">
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="api-keys">{tCommon("api_keys")}</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            </TabsList>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              {tCommon("save_changes")}
            </Button>
          </div>

          <div className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tCommon("business_information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
