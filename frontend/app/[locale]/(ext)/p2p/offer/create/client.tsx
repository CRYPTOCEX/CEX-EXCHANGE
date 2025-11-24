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

export default function CreateOfferClient() {
  const t = useTranslations("ext");
  const { settings } = useConfigStore();
  const router = useRouter();

  // If settings are not yet loaded, don't render anything (or render a loader)
  if (!settings) {
    return null;
    // Alternatively, you can render a spinner:
    // return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  // Use the helper to convert the settings to proper booleans
  const p2pEnabled = getBooleanSetting(settings?.p2pEnabled);
  const p2pMaintenanceMode = getBooleanSetting(settings?.p2pMaintenanceMode);
  const p2pAllowNewOffers = getBooleanSetting(settings?.p2pAllowNewOffers);

  // Check if P2P trading is enabled
  if (!p2pEnabled) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4" style={{ minHeight: 'calc(100vh - 232px)' }}>
        <PlatformDisabledBanner />
        <Link href="/p2p" className="mt-6">
          <Button variant="outline">{t("back_to_p2p_home")}</Button>
        </Link>
      </div>
    );
  }

  // Check if in maintenance mode
  if (p2pMaintenanceMode) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4" style={{ minHeight: 'calc(100vh - 232px)' }}>
        <MaintenanceBanner />
        <Link href="/p2p" className="mt-6">
          <Button variant="outline">{t("back_to_p2p_home")}</Button>
        </Link>
      </div>
    );
  }

  // Check if new offers are allowed
  if (!p2pAllowNewOffers) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4" style={{ minHeight: 'calc(100vh - 232px)' }}>
        <FeatureRestrictedBanner
          title="New Offers Temporarily Disabled"
          description="Creating new offers is temporarily disabled. Please check back later."
        />
        <Link href="/p2p/offer" className="mt-6">
          <Button variant="outline">{t("browse_existing_offers")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("create_a_new_offer")}</h1>
        <p className="text-muted-foreground">
          {t("follow_the_steps_trading_offer")}. {t("you_can_buy_other_users")}.
        </p>
      </div>

      <TradingWizard>
        <WizardStep
          title={t("select_trade_type")}
          helpText={t("choose_whether_you_want")}
        >
          <TradeTypeStep />
        </WizardStep>

        <WizardStep
          title={t("select_wallet_type")}
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
          title={t("set_amount_&_price")}
          helpText={t("specify_the_amount_and_price_for_your_trade")}
        >
          <AmountPriceStep />
        </WizardStep>

        <WizardStep
          title={t("payment_methods")}
          helpText={t("select_which_payment_methods_you_accept")}
        >
          <PaymentMethodsStep />
        </WizardStep>

        <WizardStep
          title={t("trade_settings")}
          helpText={t("configure_additional_settings_for_your_trade")}
        >
          <TradeSettingsStep />
        </WizardStep>

        <WizardStep
          title={t("location_settings")}
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
          title={t("review_&_create")}
          helpText={t("review_your_offer_details_before_creating")}
        >
          <ReviewStep />
        </WizardStep>
      </TradingWizard>
    </div>
  );
}
