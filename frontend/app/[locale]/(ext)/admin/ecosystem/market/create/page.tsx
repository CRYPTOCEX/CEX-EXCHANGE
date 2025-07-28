"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { useRouter, Link } from "@/i18n/routing";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
/* Reusable Multi-step components */
import BasicInfoStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-1";
import MetadataStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-2";
import PrecisionStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-3";
import LimitsStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-4";
import Stepper from "@/components/ui/stepper";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("ext");
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
        toast.success("Ecosystem market created successfully");
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
      toast.error("Please select both a currency and a pair to proceed.");
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };
  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };
  const stepLabels = [
    { label: "Basic Info", description: "Currency, Pair, & flags" },
    { label: "Metadata", description: "Taker & Maker fees" },
    { label: "Precision", description: "Decimals settings" },
    { label: "Limits & Submit", description: "Finalize your market" },
  ];
  return (
    <div
      className="p-5"
      onKeyDown={(e) => {
        if (e.key === "Enter" && step < TOTAL_STEPS) {
          e.preventDefault();
        }
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("create_ecosystem_market")}</h1>
        <Link href="/admin/ecosystem/market">
          <Button variant="outline">
            <Icon
              icon="akar-icons:arrow-left"
              className="mr-2 cursor-pointer"
            />
            {t("Back")}
          </Button>
        </Link>
      </div>
      <Stepper
        direction="horizontal"
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        stepLabels={stepLabels}
        onPrev={prevStep}
        onNext={nextStep}
        onSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
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
