"use client";
import React, { useState, useEffect } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { useRouter, Link } from "@/i18n/routing";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import StepMode from "@/app/[locale]/(ext)/admin/ecosystem/token/components/step-1";
import StepChainAndInfo from "@/app/[locale]/(ext)/admin/ecosystem/token/components/step-2";
import StepIconAndExtras from "@/app/[locale]/(ext)/admin/ecosystem/token/components/step-3";
import StepReview from "@/app/[locale]/(ext)/admin/ecosystem/token/components/step-4";
import { imageUploader } from "@/utils/upload";
import Stepper from "@/components/ui/stepper";
import { useTranslations } from "next-intl";

const initialValues: DeployFormData = {
  mode: "deploy",
  chain: "",
  name: "",
  currency: "",
  decimals: 18,
  status: true,
  initialSupply: 100000000,
  initialHolder: "",
  marketCap: 100000000,
  contract: "",
  contractType: "PERMIT",
  network: "",
  type: "",
  precision: 8,
  limits: {
    deposit: { min: 0.000001, max: 100000 },
    withdraw: { min: 0.000001, max: 100000 },
  },
  fee: { min: 0, percentage: 0 },
  icon: null,
};
export default function CreateOrImportTokenWizard() {
  const t = useTranslations("ext");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chainOptions, setChainOptions] = useState<ChainOption[]>([]);
  const [walletSufficient, setWalletSufficient] = useState<boolean>(true);
  const totalSteps = 4;
  const stepLabels = [
    { label: "Mode", description: "Deploy or Import" },
    { label: "Chain & Info", description: "Basic details" },
    {
      label: "Icon & Extras",
      description: "Upload icon, precision, limits & fee",
    },
    { label: "Review & Submit", description: "Confirm your entries" },
  ];
  // 1) Enable onChange validation so isValid updates in real time
  const methods = useForm<DeployFormData>({
    defaultValues: initialValues,
    mode: "onChange",
  });
  const { isValid } = methods.formState; // 2) Access form validity
  const mode = methods.watch("mode");
  // Fetch blockchain options
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const { data, error } = await $fetch({
          url: `/api/admin/ecosystem/blockchain/options`,
          method: "GET",
          silentSuccess: true,
        });
        setChainOptions(data);
      } catch (err: any) {
        toast.error(err.message || "Failed to load blockchains");
      }
    };
    fetchChains();
  }, []);
  const onSubmit: SubmitHandler<DeployFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      // If the icon is a File, upload it and convert it to a URL string.
      if (data.icon instanceof File) {
        const uploadResult = await imageUploader({
          file: data.icon,
          dir: "ecosystemTokens",
          size: { maxWidth: 1024, maxHeight: 728 },
        });
        if (uploadResult.success) {
          data.icon = uploadResult.url;
        } else {
          throw new Error(uploadResult.error || "Icon upload failed");
        }
      }
      // For import mode, ensure network is provided.
      if (data.mode === "import" && !data.network) {
        throw new Error("Network is required for import mode");
      }
      if (data.mode === "deploy") {
        const { error } = await $fetch({
          url: `/api/admin/ecosystem/token`,
          method: "POST",
          body: {
            name: data.name,
            currency: data.currency,
            chain: data.chain,
            decimals: data.decimals,
            status: data.status,
            precision: data.precision,
            limits: data.limits,
            fee: data.fee,
            icon: data.icon,
            initialSupply: data.initialSupply,
            initialHolder: data.initialHolder,
            marketCap: data.marketCap,
          },
        });
        if (!error) {
          toast.success("Token deployed successfully!");
          router.push("/admin/ecosystem/token");
        }
      } else {
        const { error } = await $fetch({
          url: `/api/admin/ecosystem/token/import`,
          method: "POST",
          body: {
            name: data.name,
            currency: data.currency,
            chain: data.chain,
            network: data.network,
            contract: data.contract,
            contractType: data.contractType,
            decimals: data.decimals,
            precision: data.precision,
            type: data.type,
            fee: data.fee,
            limits: data.limits,
            status: data.status,
            icon: data.icon,
          },
        });
        if (!error) {
          toast.success("Token imported successfully!");
          router.push("/admin/ecosystem/token");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  const nextStep = () => {
    // Keep existing logic that checks walletSufficient if step=2 + deploy
    if (step === 2 && mode === "deploy" && !walletSufficient) {
      toast.error(
        "Insufficient funds in master wallet. Please deposit and refresh."
      );
      return;
    }
    setStep((prev) => prev + 1);
  };
  const prevStep = () => setStep((prev) => prev - 1);
  // 3) Only disable next if we’re in Step 2 and the form is invalid or wallet is insufficient
  // If mode is import, we only need form validity
  // If mode is deploy, also need walletSufficient
  const disableNext =
    step === 2
      ? mode === "deploy"
        ? !walletSufficient || !isValid
        : !isValid
      : false;
  return (
    <FormProvider {...methods}>
      <div className="p-5 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {mode === "import"
              ? "Import Ecosystem Token"
              : "Deploy Ecosystem Token"}
          </h1>
          <Link href="/admin/ecosystem/token">
            <Button variant="outline">
              <Icon icon="akar-icons:arrow-left" className="mr-2" />
              {t("Back")}
            </Button>
          </Link>
        </div>
        <Stepper
          direction="vertical"
          currentStep={step}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
          onPrev={prevStep}
          onNext={nextStep}
          onSubmit={methods.handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
          disableNext={disableNext} // pass the computed boolean
        >
          {step === 1 && <StepMode />}
          {step === 2 && (
            <StepChainAndInfo
              chainOptions={chainOptions}
              onWalletCheck={setWalletSufficient}
            />
          )}
          {step === 3 && <StepIconAndExtras />}
          {step === 4 && <StepReview />}
        </Stepper>
      </div>
    </FormProvider>
  );
}
