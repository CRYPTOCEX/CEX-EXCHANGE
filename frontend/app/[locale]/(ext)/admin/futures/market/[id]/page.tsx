"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { useRouter, Link } from "@/i18n/routing";
import { useParams } from "next/navigation";

/* Step Components */
import FuturesBasicInfoStep from "@/app/[locale]/(ext)/admin/futures/market/components/step-1";
import FuturesMetadataStep from "@/app/[locale]/(ext)/admin/futures/market/components/step-2";
import FuturesFeesStep from "@/app/[locale]/(ext)/admin/futures/market/components/step-3";
import Stepper from "@/components/ui/stepper";
import { useTranslations } from "next-intl";

/* ----------------- Types and Initial Values ----------------- */

export type FuturesMetadata = {
  precision: {
    amount: number;
    price: number;
  };
  limits: {
    amount: { min: number; max: number };
    price: { min: number; max: number };
    cost: { min: number; max: number };
    leverage: string;
  };
  taker: number;
  maker: number;
};

export interface FuturesMarketForm {
  currency: string;
  pair: string;
  isTrending: boolean;
  isHot: boolean;
  metadata: FuturesMetadata;
}

export interface TokenOption {
  label: string;
  value: string;
}

const initialFormValues: FuturesMarketForm = {
  currency: "",
  pair: "",
  isTrending: true,
  isHot: true,
  metadata: {
    precision: { amount: 8, price: 6 },
    limits: {
      amount: { min: 0.00001, max: 10000 },
      price: { min: 0.00001, max: 0 },
      cost: { min: 0, max: 0 },
      leverage: "",
    },
    taker: 1,
    maker: 1,
  },
};

const TOTAL_STEPS = 2;

const EditFuturesMarket = () => {
  const t = useTranslations("ext");
  const router = useRouter();
  const { id } = useParams();
  const [formData, setFormData] =
    useState<FuturesMarketForm>(initialFormValues);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenOptions, setTokenOptions] = useState<TokenOption[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [step, setStep] = useState(1);

  // 1) Fetch token options (using the same logic as in your ecosystem market)
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
        // Convert each token => { label, value }
        // e.g. "MO - Mo Chain (MO)" becomes { label: "MO - Mo Chain (MO)", value: "MO" }
        const formatted: TokenOption[] = data.map((token: any) => {
          const symbol = token.name.split("-")[0].trim();
          return {
            label: token.name,
            value: symbol,
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

  // 2) Fetch existing futures market data by ID and prepopulate the form
  useEffect(() => {
    if (!id) return;
    const fetchMarketData = async () => {
      try {
        const { data, error } = await $fetch({
          url: `/api/admin/futures/market/${id}`,
          method: "GET",
          silent: true,
        });
        if (error) {
          toast.error(error);
          return;
        }
        // Merge fetched data with defaults so all nested keys exist.
        setFormData({
          ...initialFormValues,
          ...data,
          metadata: {
            ...initialFormValues.metadata,
            ...data.metadata,
            limits: {
              ...initialFormValues.metadata.limits,
              ...data.metadata.limits,
            },
          },
        });
      } catch (err: any) {
        toast.error(err.message || "Failed to load market data");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchMarketData();
  }, [id]);

  // Helper: update top-level fields
  const updateField = (field: keyof FuturesMarketForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper: update nested fields (e.g., metadata.precision.amount)
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

  // Submit final update
  const handleFinalSubmit = async () => {
    if (step !== TOTAL_STEPS) return;
    setIsSubmitting(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/futures/market/${id}`,
        method: "PUT",
        body: formData,
      });
      if (!error) {
        router.push("/admin/futures/market");
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
    {
      label: "Metadata & Fees",
      description: "Configure market settings & fees",
    },
  ];

  if (isLoadingData) {
    return <p className="p-5">{t("loading_market_data")}.</p>;
  }

  return (
    <div
      className="p-5 space-y-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && step < TOTAL_STEPS) {
          e.preventDefault();
        }
      }}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("edit_futures_market")}</h1>
        <Link href="/admin/futures/market">
          <Button variant="outline">
            <Icon icon="akar-icons:arrow-left" className="mr-2" />
            {t("Back")}
          </Button>
        </Link>
      </div>
      <Stepper
        direction="vertical"
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        stepLabels={stepLabels}
        onPrev={prevStep}
        onNext={nextStep}
        onSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
      >
        {step === 1 && (
          <FuturesBasicInfoStep
            formData={formData}
            updateField={updateField}
            tokenOptions={tokenOptions}
            isLoadingTokens={isLoadingTokens}
          />
        )}
        {step === 2 && (
          <>
            <FuturesMetadataStep
              formData={formData}
              updateNestedField={updateNestedField}
            />
            <FuturesFeesStep
              formData={formData}
              updateNestedField={updateNestedField}
            />
          </>
        )}
      </Stepper>
    </div>
  );
};

export default EditFuturesMarket;
