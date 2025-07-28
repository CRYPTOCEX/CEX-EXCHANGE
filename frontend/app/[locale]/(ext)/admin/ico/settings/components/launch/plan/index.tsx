"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";

import LaunchPlansList from "./launch-plans-list";
import AddLaunchPlanForm from "./add-launch-plan-form";
import EditLaunchPlanForm from "./edit-launch-plan-form";
import { useTranslations } from "next-intl";

export default function LaunchPlansConfiguration({
  isActive,
}: {
  isActive: boolean;
}) {
  const t = useTranslations("ext");
  const [plans, setPlans] = useState<icoLaunchPlanAttributes[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlan, setEditingPlan] =
    useState<icoLaunchPlanAttributes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    setError(null);
    const { data, error } = await $fetch({
      url: "/api/admin/ico/settings/launch/plan",
      silent: true,
    });
    if (error) {
      setError("Failed to load launch plans");
    } else if (data) {
      // Parse features if it comes as a JSON string
      const parsedData = data.map((plan) => ({
        ...plan,
        features:
          typeof plan.features === "string"
            ? JSON.parse(plan.features)
            : plan.features,
      }));
      setPlans(parsedData);
    }
    setLoading(false);
  }

  // For adding a new plan via POST endpoint.
  const handleAddPlan = async (plan: Omit<icoLaunchPlanAttributes, "id">) => {
    setSaving(true);
    setError(null);
    const { error } = await $fetch({
      url: "/api/admin/ico/settings/launch/plan",
      method: "POST",
      body: plan,
    });
    if (error) {
      setError("Failed to add launch plan");
    } else {
      await fetchPlans();
    }
    setSaving(false);
    setShowAddForm(false);
  };

  // For updating an existing plan via PUT endpoint.
  const handleUpdatePlan = async (updatedPlan: icoLaunchPlanAttributes) => {
    setSaving(true);
    setError(null);
    const { error } = await $fetch({
      url: `/api/admin/ico/settings/launch/plan/${updatedPlan.id}`,
      method: "PUT",
      body: updatedPlan,
    });
    if (error) {
      setError("Failed to update launch plan");
    } else {
      await fetchPlans();
    }
    setSaving(false);
    setEditingPlan(null);
  };

  // For deleting a plan via DELETE endpoint.
  const handleDeletePlan = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this plan?"
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    const { error } = await $fetch({
      url: `/api/admin/ico/settings/launch/plan/${id}`,
      method: "DELETE",
    });
    if (error) {
      setError("Failed to delete launch plan");
    } else {
      await fetchPlans();
    }
    setSaving(false);
  };

  // For updating only the status of a single plan.
  const handleToggleStatus = async (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    const newStatus = !plan.status;
    setSaving(true);
    setError(null);
    const { error } = await $fetch({
      url: `/api/admin/ico/settings/launch/plan/${id}/status`,
      method: "PUT",
      body: { status: newStatus },
    });
    if (error) {
      setError("Failed to update plan status");
    } else {
      // Update only the clicked record's status in local state.
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    }
    setSaving(false);
  };

  // For updating recommended plan using the new dedicated endpoint.
  const handleSetRecommended = async (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    const newRecommended = !plan.recommended;
    setSaving(true);
    setError(null);
    const { error } = await $fetch({
      url: `/api/admin/ico/settings/launch/plan/${id}/recommanded`,
      method: "PUT",
      body: { recommended: newRecommended },
    });
    if (error) {
      setError("Failed to update recommended plan");
    } else {
      await fetchPlans();
    }
    setSaving(false);
  };

  // For bulk updates (e.g. reordering).
  const handleReorderPlans = async (
    reorderedPlans: icoLaunchPlanAttributes[]
  ) => {
    const updatedPlans = reorderedPlans.map((plan, index) => ({
      ...plan,
      sortOrder: index + 1,
    }));
    setSaving(true);
    setError(null);
    const { error } = await $fetch({
      url: "/api/admin/ico/settings/launch/plan",
      method: "PUT",
      body: updatedPlans,
    });
    if (error) {
      setError("Failed to reorder launch plans");
    } else {
      await fetchPlans();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (editingPlan) {
    return (
      <EditLaunchPlanForm
        plan={editingPlan}
        onSave={handleUpdatePlan}
        onCancel={() => setEditingPlan(null)}
        isActive={isActive}
      />
    );
  }

  if (showAddForm) {
    return (
      <AddLaunchPlanForm
        onAdd={handleAddPlan}
        onCancel={() => setShowAddForm(false)}
        isActive={isActive}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("launch_plans")}</CardTitle>
            <CardDescription>
              {t("configure_pricing_plans_for_token_launches")}.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("add_plan")}
          </Button>
        </CardHeader>
        <CardContent>
          <LaunchPlansList
            plans={plans}
            onToggleStatus={handleToggleStatus}
            onSetRecommended={handleSetRecommended}
            onEdit={setEditingPlan}
            onDelete={handleDeletePlan}
            onReorder={handleReorderPlans}
          />
        </CardContent>
      </Card>
    </div>
  );
}
