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
    description: plan.description,
    price: plan.price.toString(),
    walletType: plan.walletType,
    currency: plan.currency,
    recommended: plan.recommended,
    status: plan.status,
    features: {
      maxTeamMembers: parsedFeatures.maxTeamMembers.toString(),
      maxRoadmapItems: parsedFeatures.maxRoadmapItems.toString(),
      maxOfferingPhases: parsedFeatures.maxOfferingPhases.toString(),
      maxUpdatePosts: parsedFeatures.maxUpdatePosts
        ? parsedFeatures.maxUpdatePosts.toString()
        : "0", // Added posts support
      supportLevel: parsedFeatures.supportLevel,
      marketingSupport: parsedFeatures.marketingSupport,
      auditIncluded: parsedFeatures.auditIncluded,
      customTokenomics: parsedFeatures.customTokenomics,
      priorityListing: parsedFeatures.priorityListing,
      kycRequired: parsedFeatures.kycRequired,
    },
  };

  const handleSubmit = (values: LaunchPlanFormValues) => {
    onSave({
      ...plan,
      name: values.name,
      description: values.description,
      price: parseFloat(values.price),
      walletType: values.walletType,
      currency: values.currency,
      recommended: values.recommended,
      status: values.status,
      features: {
        maxTeamMembers: parseInt(values.features.maxTeamMembers),
        maxRoadmapItems: parseInt(values.features.maxRoadmapItems),
        maxOfferingPhases: parseInt(values.features.maxOfferingPhases),
        maxUpdatePosts: parseInt(values.features.maxUpdatePosts), // Added posts support
        supportLevel: values.features.supportLevel,
        marketingSupport: values.features.marketingSupport,
        auditIncluded: values.features.auditIncluded,
        customTokenomics: values.features.customTokenomics,
        priorityListing: values.features.priorityListing,
        kycRequired: values.features.kycRequired,
      },
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
