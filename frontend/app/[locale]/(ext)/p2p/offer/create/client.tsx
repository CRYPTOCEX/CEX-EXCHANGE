"use client";

import { useConfigStore } from "@/store/config";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { MaintenanceBanner } from "../../components/maintenance-banner";
import { FeatureRestrictedBanner } from "../../components/feature-restricted-banner";
import { PlatformDisabledBanner } from "../../components/platform-disabled-banner";
import { getBooleanSetting } from "@/utils/formatters";
import { TradingWizard, WizardStep } from "./components/trading-wizard";
import { TradeTypeStep } from "./components/steps/trade-type-step";
import { WalletTypeStep } from "./components/steps/wallet-type-step";
import { SelectCryptoStep } from "./components/steps/select-crypto-step";
import { AmountPriceStep } from "./components/steps/amount-price-step";
import { PaymentMethodsStep } from "./components/steps/payment-methods-step";
import { TradeSettingsStep } from "./components/steps/trade-settings-step";
import { LocationSettingsStep } from "./components/steps/location-settings-step";
import { UserRequirementsStep } from "./components/steps/user-requirements-step";
import { ReviewStep } from "./components/steps/review-step";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { Sparkles, Plus } from "lucide-react";

export default function CreateOfferClient() {
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { settings } = useConfigStore();
  const router = useRouter();

  // If settings are not yet loaded, show loading state
  if (!settings) {
    const CreateOfferLoading = require('./loading').default;
    return <CreateOfferLoading />;
  }

  // Use the helper to convert the settings to proper booleans
  const p2pEnabled = getBooleanSetting(settings?.p2pEnabled);
  const p2pMaintenanceMode = getBooleanSetting(settings?.p2pMaintenanceMode);
  const p2pAllowNewOffers = getBooleanSetting(settings?.p2pAllowNewOffers);

  // Check if P2P trading is enabled
  if (!p2pEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
        <HeroSection
          badge={{
            icon: <Plus className="h-3.5 w-3.5" />,
            text: "Create Offer",
            gradient: `from-blue-500/10 to-violet-500/10`,
            iconColor: `text-blue-500`,
            textColor: `text-blue-600 dark:text-blue-400`,
          }}
          title={[{ text: t("create_a_new_offer") }]}
          description={t("follow_the_steps_trading_offer")}
          paddingTop="pt-24"
          paddingBottom="pb-12"
          background={{
            orbs: [
              { color: "#3b82f6", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
              { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
            ],
          }}
          particles={{ count: 6, type: "floating", colors: ["#3b82f6", "#8b5cf6"], size: 8 }}
        />
        <div className="container max-w-4xl mx-auto py-12">
          <PlatformDisabledBanner />
          <Link href="/p2p" className="mt-6 inline-block">
            <Button variant="outline">{t("back_to_p2p_home")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if in maintenance mode
  if (p2pMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
        <HeroSection
          badge={{
            icon: <Plus className="h-3.5 w-3.5" />,
            text: "Create Offer",
            gradient: `from-blue-500/10 to-violet-500/10`,
            iconColor: `text-blue-500`,
            textColor: `text-blue-600 dark:text-blue-400`,
          }}
          title={[{ text: t("create_a_new_offer") }]}
          description={t("follow_the_steps_trading_offer")}
          paddingTop="pt-24"
          paddingBottom="pb-12"
          background={{
            orbs: [
              { color: "#3b82f6", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
              { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
            ],
          }}
          particles={{ count: 6, type: "floating", colors: ["#3b82f6", "#8b5cf6"], size: 8 }}
        />
        <div className="container max-w-4xl mx-auto py-12">
          <MaintenanceBanner />
          <Link href="/p2p" className="mt-6 inline-block">
            <Button variant="outline">{t("back_to_p2p_home")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if new offers are allowed
  if (!p2pAllowNewOffers) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
        <HeroSection
          badge={{
            icon: <Plus className="h-3.5 w-3.5" />,
            text: "Create Offer",
            gradient: `from-blue-500/10 to-violet-500/10`,
            iconColor: `text-blue-500`,
            textColor: `text-blue-600 dark:text-blue-400`,
          }}
          title={[{ text: t("create_a_new_offer") }]}
          description={t("follow_the_steps_trading_offer")}
          paddingTop="pt-24"
          paddingBottom="pb-12"
          background={{
            orbs: [
              { color: "#3b82f6", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
              { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
            ],
          }}
          particles={{ count: 6, type: "floating", colors: ["#3b82f6", "#8b5cf6"], size: 8 }}
        />
        <div className="container max-w-4xl mx-auto py-12">
          <FeatureRestrictedBanner
            title={t("new_offers_temporarily_disabled")}
            description={t("creating_new_offers_is_temporarily_disabled")}
          />
          <Link href="/p2p/offer" className="mt-6 inline-block">
            <Button variant="outline">{t("browse_existing_offers")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Plus className="h-3.5 w-3.5" />,
          text: "Create Offer",
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[{ text: t("create_a_new_offer") }]}
        description={`${t("follow_the_steps_trading_offer")}. ${t("you_can_buy_other_users")}.`}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        background={{
          orbs: [
            { color: "#3b82f6", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{ count: 6, type: "floating", colors: ["#3b82f6", "#8b5cf6"], size: 8 }}
      />

      <main className="container max-w-4xl mx-auto py-12">
      <TradingWizard>
        <WizardStep
          title={t("select_trade_type")}
          helpText={t("choose_whether_you_want")}
        >
          <TradeTypeStep />
        </WizardStep>

        <WizardStep
          title={tCommon("select_wallet_type")}
          helpText={t("choose_which_wallet_you_want_to_use_for_this_trade")}
        >
          <WalletTypeStep />
        </WizardStep>

        <WizardStep
          title={t("select_cryptocurrency")}
          helpText={t("choose_which_cryptocurrency_you_want_to_trade")}
        >
          <SelectCryptoStep />
        </WizardStep>

        <WizardStep
          title={t("set_amount_price")}
          helpText={t("specify_the_amount_and_price_for_your_trade")}
        >
          <AmountPriceStep />
        </WizardStep>

        <WizardStep
          title={tExt("payment_methods")}
          helpText={t("select_which_payment_methods_you_accept")}
        >
          <PaymentMethodsStep />
        </WizardStep>

        <WizardStep
          title={tCommon("trade_settings")}
          helpText={t("configure_additional_settings_for_your_trade")}
        >
          <TradeSettingsStep />
        </WizardStep>

        <WizardStep
          title={tExt("location_settings")}
          helpText={t("specify_your_location_and")}
        >
          <LocationSettingsStep />
        </WizardStep>

        <WizardStep
          title={t("user_requirements")}
          helpText={t("set_requirements_for_users")}
        >
          <UserRequirementsStep />
        </WizardStep>

        <WizardStep
          title={t("review_create")}
          helpText={t("review_your_offer_details_before_creating")}
        >
          <ReviewStep />
        </WizardStep>
      </TradingWizard>
      </main>
    </div>
  );
}
