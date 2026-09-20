"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /copy-trading/leader/[id]/follow.
 *
 * WAS: `flex items-center justify-center min-h-screen pt-20` + an `h-8 w-8`
 * spinner. The settled page is `bg-muted/30` wrapping
 * `container mx-auto px-4 py-8 pt-20`: a back link, a centred `text-3xl
 * md:text-4xl` headline, a `text-lg` sub-heading and the allocation form. The
 * spinner reserved none of it, and centred on the viewport rather than inside
 * the container, so the whole page slid up and left as the leader resolved.
 *
 * NOW: that frame, with the one genuinely unknown value — the leader's display
 * name inside "Follow {name}" — measured by `SkeletonText` INSIDE the real
 * `text-3xl md:text-4xl` heading. That is the point of the primitive: the
 * placeholder inherits the heading's font, size and leading, so its height is
 * produced by the same text layout that will run on the real name.
 *
 * `client.tsx` imports this file for its own `isLoading` branch, hence
 * "use client" and the shared translation namespaces.
 */
export default function FollowLeaderLoading() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");

  return (
    <div className="bg-muted/30">
      <div className="container mx-auto px-4 py-8 pt-20">
        <span className="inline-flex items-center text-sm text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back_to_profile")}
        </span>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Follow <SkeletonText placeholder={tExt("leader_name")} />
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("configure_your_copy_trading_settings")}
          </p>
        </div>

        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
