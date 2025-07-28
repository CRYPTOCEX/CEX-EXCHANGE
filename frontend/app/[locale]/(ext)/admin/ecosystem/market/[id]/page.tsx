"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
/* Reusable multi‑step components */
import BasicInfoStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-1";
import MetadataStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-2";
import PrecisionStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-3";
import LimitsStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-4";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import Stepper from "@/components/ui/stepper";
import { useTranslations } from "next-intl";

/* ----------------------- Type Definitions ----------------------- */
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
    leverage?: { value: number }; // if you have that field
  };
};
export interface MarketForm {
  currency: string; // e.g. "MO"
  pair: string; // e.g. "USDT"
  isTrending: boolean;
  isHot: boolean;
  metadata: Metadata;
}
export interface TokenOption {
  label: string;
  value: string; // We'll store the symbol (e.g. "MO") so it matches the server
}
/* ----------------------- Default Form Values ----------------------- */
const defaultFormValues: MarketForm = {
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
      leverage: { value: 0 }, // if needed
    },
  },
};
const TOTAL_STEPS = 4;
/* ----------------------- EditEcosystemMarket Component ----------------------- */
const EditEcosystemMarket = () => {
  const t = useTranslations("ext");
  const router = useRouter();
  const { id } = useParams();
  const [formData, setFormData] = useState<MarketForm>(defaultFormValues);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenOptions, setTokenOptions] = useState<TokenOption[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [step, setStep] = useState(1);
  // 1) Fetch token options (parsing symbol from token.name)
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
        // Convert each token => { label, value },
        // so "MO - Mo Chain (MO)" => { label: "MO - Mo Chain (MO)", value: "MO" }
        const formatted: TokenOption[] = data.map((token: any) => {
          // Example parse: symbol is everything before the first " - "
          // Adjust if your naming is different
          const symbol = token.name.split("-")[0].trim();
          return {
            label: token.name, // "MO - Mo Chain (MO)"
            value: symbol, // "MO"
          };
        });
        setTokenOptions(formatted);
      } catch (err: any) {
        toast.error(err.message || "Failed to load token options");
      } finally {
        setIsLoadingTokens(false);
      }
    };
    fetchTokenOptions();
  }, []);
  // 2) Fetch existing market data by ID and prepopulate the form
  useEffect(() => {
    if (!id) return;
    const fetchMarketData = async () => {
      try {
        const { data, error } = await $fetch({
          url: `/api/admin/ecosystem/market/${id}`,
          method: "GET",
          silent: true,
        });
        if (error) {
          toast.error(error);
          return;
        }
        // e.g. data = { currency: "MO", pair: "USDT", isTrending: true, ... }
        setFormData(data);
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch market data");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchMarketData();
  }, [id]);
  // Helper: update top-level fields
  const updateField = (field: keyof MarketForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  // Helper: update nested fields (e.g. metadata.precision.amount)
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
  // Submit final
  const handleFinalSubmit = async () => {
    if (step !== TOTAL_STEPS) return;
    setIsSubmitting(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/ecosystem/market/${id}`,
        method: "PUT",
        body: formData,
      });
      if (!error) {
        toast.success("Ecosystem market updated successfully");
        router.push("/admin/market");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  // Step navigation
  const nextStep = () => {
    // simple validation on step 1
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
  if (isLoadingData) {
    return <p className="p-5">{t("loading_market_data")}.</p>;
  }
  return (
    <div
      className="p-5"
      onKeyDown={(e) => {
        // prevent Enter from skipping steps prematurely
        if (e.key === "Enter" && step < TOTAL_STEPS) {
          e.preventDefault();
        }
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("edit_ecosystem_market")}</h1>
        <Link href="/admin/ecosysatem/market">
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
export default EditEcosystemMarket;
