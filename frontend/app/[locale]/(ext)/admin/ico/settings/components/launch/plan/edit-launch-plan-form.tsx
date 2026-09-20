"use client";

import React from "react";
import LaunchPlanForm, { LaunchPlanFormValues } from "./form";

interface EditLaunchPlanFormProps {
  plan: icoLaunchPlanAttributes;
  onSave: (plan: icoLaunchPlanAttributes) => void;
  onCancel: () => void;
  isActive: boolean;
}

export default function EditLaunchPlanForm({
  plan,
  onSave,
  onCancel,
  isActive,
}: EditLaunchPlanFormProps) {
  const parsedFeatures =
    typeof plan.features === "string"
      ? JSON.parse(plan.features)
      : plan.features;

  const initialValues: LaunchPlanFormValues = {
    name: plan.name,
    description: plan.description ?? "",
    price: plan.price.toString(),
    walletType: plan.walletType,
    currency: plan.currency,
    recommended: plan.recommended,
    status: plan.status,
    features: {
      maxTeamMembers: parsedFeatures?.maxTeamMembers?.toString() ?? "0",
      maxRoadmapItems: parsedFeatures?.maxRoadmapItems?.toString() ?? "0",
      maxOfferingPhases: parsedFeatures?.maxOfferingPhases?.toString() ?? "0",
      maxUpdatePosts: parsedFeatures?.maxUpdatePosts?.toString() ?? "0",
      supportLevel: parsedFeatures?.supportLevel ?? "basic",
      marketingSupport: parsedFeatures?.marketingSupport ?? false,
      auditIncluded: parsedFeatures?.auditIncluded ?? false,
      customTokenomics: parsedFeatures?.customTokenomics ?? false,
      priorityListing: parsedFeatures?.priorityListing ?? false,
      kycRequired: parsedFeatures?.kycRequired ?? false,
    },
  };

  const handleSubmit = (values: LaunchPlanFormValues) => {
    const features: IcoLaunchPlanFeatures = {
      maxTeamMembers: parseInt(values.features.maxTeamMembers),
      maxRoadmapItems: parseInt(values.features.maxRoadmapItems),
      maxOfferingPhases: parseInt(values.features.maxOfferingPhases),
      maxUpdatePosts: parseInt(values.features.maxUpdatePosts),
      supportLevel: values.features.supportLevel as "basic" | "standard" | "premium",
      marketingSupport: values.features.marketingSupport,
      auditIncluded: values.features.auditIncluded,
      customTokenomics: values.features.customTokenomics,
      priorityListing: values.features.priorityListing,
      kycRequired: values.features.kycRequired,
    };
    onSave({
      ...plan,
      name: values.name,
      description: values.description,
      price: parseFloat(values.price),
      walletType: (values.walletType || plan.walletType) as "FIAT" | "SPOT" | "ECO",
      currency: values.currency,
      recommended: values.recommended,
      status: values.status,
      features,
    });
  };

  return (
    <LaunchPlanForm
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isActive={isActive}
    />
  );
}
