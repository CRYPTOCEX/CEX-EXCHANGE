import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Shield, Lock, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { FEATURE_MESSAGES, type KycFeatureId } from "@/config/kyc-features";

// The per-feature copy lives in @/config/kyc-features, typed as a TOTAL map
// over the feature id union. It used to be an object literal in this file that
// had fallen ten ids behind the admin level builder — those gates silently
// rendered the generic "Verification Required" text instead of naming what was
// actually locked. Adding an id without copy is now a compile error.

export default function KycRequiredNotice({
  feature,
  requirement = "verification",
}: {
  feature?: string;
  requirement?: "verification" | "higher_level";
}) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const featureInfo = feature
    ? FEATURE_MESSAGES[feature as KycFeatureId]
    : null;
  // "higher_level" means the user IS verified but their current level does not
  // include this feature — so we must NOT tell them to "complete verification"
  // (that loops them back to a KYC page already showing 100% complete).
  const isHigherLevel = requirement === "higher_level";

  return (
    <div className="flex flex-col items-center justify-center h-full pt-22 pb-6 px-4">
      <div className="relative">
        {/* Background gradient circle */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl w-64 h-64 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />

        {/* Main content container */}
        <div className="relative bg-background/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
          {/* Icon container */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-primary p-4 rounded-full">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 bg-warning rounded-full p-1">
                <Lock className="w-3 h-3 text-warning-foreground" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {isHigherLevel
                ? featureInfo
                  ? t("unavailable", { title: String(featureInfo.title) })
                  : t("access_not_available")
                : featureInfo
                  ? featureInfo.title
                  : tCommon("verification_required")}
            </h2>
            <div className="w-16 h-1 bg-primary rounded-full mx-auto" />
          </div>

          {/* Description */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground leading-relaxed">
              {isHigherLevel
                ? t("your_account_is_verified_but_your")
                : featureInfo
                  ? featureInfo.description
                  : t("complete_our_quick_and_secure_verification")}
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-muted-foreground">
                {t("enhanced_account_security")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-muted-foreground">
                {t("regulatory_compliance")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-muted-foreground">
                {t("fraud_protection")}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link href="/user/kyc">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {isHigherLevel
                  ? t("view_verification_levels")
                  : t("complete_verification")}
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              {isHigherLevel
                ? t("contact_support_if_you_need_this")
                : t("usually_takes_2_3_minutes")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
