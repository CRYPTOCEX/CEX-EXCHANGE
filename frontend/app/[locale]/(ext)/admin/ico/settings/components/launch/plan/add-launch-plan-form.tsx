"use client";

import React from "react";
import LaunchPlanForm, { LaunchPlanFormValues } from "./form";

interface AddLaunchPlanFormProps {
  onAdd: (plan: Omit<icoLaunchPlanAttributes, "id">) => void;
  onCancel: () => void;
  isActive: boolean;
}

export default function AddLaunchPlanForm({
  onAdd,
  onCancel,
  isActive,
}: AddLaunchPlanFormProps) {
  const initialValues: LaunchPlanFormValues = {
    name: "Basic",
    description: "Basic plan for small teams",
    price: "999",
    walletType: "",
    currency: "",
    recommended: false,
    status: true,
    features: {
      maxTeamMembers: "5",
      maxRoadmapItems: "10",
      maxOfferingPhases: "3",
      maxUpdatePosts: "10", // Added posts support with default value
      supportLevel: "standard",
      marketingSupport: false,
      auditIncluded: false,
      customTokenomics: false,
      priorityListing: false,
      kycRequired: true,
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
    onAdd({
      name: values.name,
      description: values.description,
      price: parseFloat(values.price),
      walletType: (values.walletType || "FIAT") as "FIAT" | "SPOT" | "ECO",
      currency: values.currency,
      recommended: values.recommended,
      status: values.status,
      features,
      sortOrder: 999,
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
