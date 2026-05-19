"use client";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
/* Reusable multi‑step components */
import BasicInfoStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-1";
import MetadataStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-2";
import PrecisionStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-3";
import LimitsStep from "@/app/[locale]/(ext)/admin/ecosystem/market/components/step-4";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import Stepper from "@/components/ui/stepper";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import {
  ArrowLeft,
  Coins,
  Percent,
  Hash,
  Gauge,
  Loader2,
} from "lucide-react";

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
    leverage?: { value: number };
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
      leverage: { value: 0 },
    },
  },
};

const TOTAL_STEPS = 4;

/* ----------------------- EditEcosystemMarket Component ----------------------- */
const EditEcosystemMarket = () => {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { id } = useParams();
  const [formData, setFormData] = useState<MarketForm>(defaultFormValues);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenOptions, setTokenOptions] = useState<TokenOption[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [step, setStep] = useState(1);

  // Fetch token options
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

  // Fetch existing market data
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

  // Helper: update nested fields
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
        toast.success(tExtAdmin("market_updated_successfully"));
        router.push("/admin/ecosystem/market");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (step === 1 && (!formData.currency || !formData.pair)) {
      toast.error(tExtAdmin("please_select_currency_and_pair"));
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
      description: tExtAdmin("currency_pair_flags"),
      icon: <Coins className="h-4 w-4" />,
    },
    {
      label: t("metadata"),
      description: tExtAdmin("taker_maker_fees"),
      icon: <Percent className="h-4 w-4" />,
    },
    {
      label: t("precision"),
      description: tExtAdmin("decimal_settings"),
      icon: <Hash className="h-4 w-4" />,
    },
    {
      label: t("limits"),
      description: tExtAdmin("finalize_market"),
      icon: <Gauge className="h-4 w-4" />,
    },
  ];

  if (isLoadingData) {
    return (
      <div className={`container ${PAGE_PADDING}`}>
        <Card className="p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("loading_market_data")}...</p>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">{tExtAdmin("edit_ecosystem_market")}</h1>
          {formData.currency && formData.pair && (
            <p className="text-muted-foreground mt-1">
              {formData.currency}/{formData.pair}
            </p>
          )}
        </div>
        <Link href="/admin/ecosystem/market">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
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
        showProgress={false}
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
