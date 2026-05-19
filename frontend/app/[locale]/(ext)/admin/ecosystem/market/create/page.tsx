"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
/* Reusable Multi-step components */
import BasicInfoStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-1";
import MetadataStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-2";
import PrecisionStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-3";
import LimitsStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-4";
import Stepper from "@/components/ui/stepper";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import {
  ArrowLeft,
  Coins,
  Percent,
  Hash,
  Gauge,
} from "lucide-react";

/* ----------------- Types and Initial Values ----------------- */
export type Metadata = {
  taker: number;
  maker: number;
  precision: {
    amount: number;
    price: number;
  };
  limits: {
    amount: { min: number; max: number };
    price: { min: number; max: number };
    cost: { min: number; max: number };
  };
};

export interface MarketForm {
  currency: string;
  pair: string;
  isTrending: boolean;
  isHot: boolean;
  metadata: Metadata;
}

export interface TokenOption {
  label: string;
  value: string;
  symbol: string;
}

const initialFormValues: MarketForm = {
  currency: "",
  pair: "",
  isTrending: true,
  isHot: true,
  metadata: {
    taker: 1,
    maker: 1,
    precision: { amount: 8, price: 6 },
    limits: {
      amount: { min: 0.00001, max: 10000 },
      price: { min: 0.00001, max: 0 },
      cost: { min: 0, max: 0 },
    },
  },
};

const TOTAL_STEPS = 4;

const CreateEcosystemMarket = () => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [formData, setFormData] = useState<MarketForm>(initialFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenOptions, setTokenOptions] = useState<TokenOption[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const fetchTokenOptions = async () => {
      try {
        const { data, error } = await $fetch({
          url: `/api/admin/ecosystem/token/options`,
          method: "GET",
          silent: true,
        });
        if (error) {
          toast.error(error || "Failed to load token options");
          return;
        }
        const formatted: TokenOption[] = data.map((token: any) => ({
          label: token.name,
          value: token.id,
          symbol: token.name.split("-")[0].trim(),
        }));
        setTokenOptions(formatted);
      } catch (err: any) {
        toast.error(err.message || "Failed to load token options");
      } finally {
        setIsLoadingTokens(false);
      }
    };
    fetchTokenOptions();
  }, []);

  const updateField = (field: keyof MarketForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (path: string, value: any) => {
    const keys = path.split(".");
    setFormData((prev) => {
      const updated = { ...prev };
      let current: any = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleFinalSubmit = async () => {
    if (step !== TOTAL_STEPS) return;
    setIsSubmitting(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/ecosystem/market`,
        method: "POST",
        body: formData,
      });
      if (!error) {
        toast.success(t("market_created_successfully"));
        router.push("/admin/ecosystem/market");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.currency || !formData.pair)) {
      toast.error(t("please_select_currency_and_pair"));
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const stepLabels = [
    {
      label: tCommon("basic_info"),
      description: t("currency_pair_flags"),
      icon: <Coins className="h-4 w-4" />,
    },
    {
      label: tCommon("metadata"),
      description: t("taker_maker_fees"),
      icon: <Percent className="h-4 w-4" />,
    },
    {
      label: tCommon("precision"),
      description: t("decimal_settings"),
      icon: <Hash className="h-4 w-4" />,
    },
    {
      label: tCommon("limits"),
      description: t("finalize_market"),
      icon: <Gauge className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className={`container ${PAGE_PADDING}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" && step < TOTAL_STEPS) {
          e.preventDefault();
        }
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("create_ecosystem_market")}</h1>
          {formData.currency && formData.pair && (
            <p className="text-muted-foreground mt-1">
              {tokenOptions.find((t) => t.value === formData.currency)?.symbol || formData.currency}/
              {tokenOptions.find((t) => t.value === formData.pair)?.symbol || formData.pair}
            </p>
          )}
        </div>
        <Link href="/admin/ecosystem/market">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Button>
        </Link>
      </div>

      {/* Stepper */}
      <Stepper
        direction="horizontal"
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        stepLabels={stepLabels}
        onPrev={prevStep}
        onNext={nextStep}
        onSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
        variant="timeline"
        colorScheme="default"
        animation="slide"
        showStepDescription={true}
      >
        {step === 1 && (
          <BasicInfoStep
            formData={formData}
            updateField={updateField}
            tokenOptions={tokenOptions}
            isLoadingTokens={isLoadingTokens}
          />
        )}
        {step === 2 && (
          <MetadataStep
            formData={formData}
            updateNestedField={updateNestedField}
          />
        )}
        {step === 3 && (
          <PrecisionStep
            formData={formData}
            updateNestedField={updateNestedField}
          />
        )}
        {step === 4 && (
          <LimitsStep
            formData={formData}
            updateNestedField={updateNestedField}
          />
        )}
      </Stepper>
    </div>
  );
};

export default CreateEcosystemMarket;
