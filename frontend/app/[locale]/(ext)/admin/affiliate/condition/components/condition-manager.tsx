"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import {
  Save,
  Loader2,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import $fetch from "@/lib/api";
import { ConditionSidebar } from "./condition-sidebar";
import { ConditionEditor } from "./condition-editor";
import { Condition } from "./types";
import { cn } from "@/lib/utils";

export function ConditionManager() {
  const t = useTranslations("common");
  const router = useRouter();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editedCondition, setEditedCondition] = useState<Condition | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchConditions = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await $fetch({
      url: "/api/admin/affiliate/condition",
      silent: true,
    });

    if (!error && data) {
      setConditions(data);
      if (data.length > 0 && !selectedCondition) {
        setSelectedCondition(data[0]);
        setEditedCondition(data[0]);
      }
    }
    setIsLoading(false);
  }, [selectedCondition]);

  useEffect(() => {
    fetchConditions();
  }, []);

  const handleSelectCondition = (condition: Condition) => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard them?")) {
        return;
      }
    }
    setSelectedCondition(condition);
    setEditedCondition(condition);
    setHasChanges(false);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleFieldChange = (field: keyof Condition, value: any) => {
    if (!editedCondition) return;
    setEditedCondition({ ...editedCondition, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!editedCondition || !selectedCondition) return;

    setIsSaving(true);
    const { error } = await $fetch({
      url: `/api/admin/affiliate/condition/${selectedCondition.id}`,
      method: "PUT",
      body: {
        title: editedCondition.title,
        description: editedCondition.description,
        reward: editedCondition.reward,
        rewardType: editedCondition.rewardType,
        rewardWalletType: editedCondition.rewardWalletType,
        rewardCurrency: editedCondition.rewardCurrency,
        rewardChain: editedCondition.rewardChain,
        minAmount: editedCondition.minAmount,
        status: editedCondition.status,
      },
    });

    if (!error) {
      toast.success("Condition updated successfully");
      setSelectedCondition(editedCondition);
      setConditions((prev) =>
        prev.map((c) => (c.id === editedCondition.id ? editedCondition : c))
      );
      setHasChanges(false);
    } else {
      toast.error("Failed to update condition");
    }
    setIsSaving(false);
  };

  const handleToggleStatus = async (id: string, status: boolean) => {
    const { error } = await $fetch({
      url: `/api/admin/affiliate/condition/${id}`,
      method: "PUT",
      body: { status },
      silent: true,
    });

    if (!error) {
      setConditions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
      if (selectedCondition?.id === id) {
        setSelectedCondition((prev) => (prev ? { ...prev, status } : null));
        setEditedCondition((prev) => (prev ? { ...prev, status } : null));
      }
      toast.success(`Condition ${status ? "enabled" : "disabled"}`);
    }
  };

  const handleBack = () => {
    router.push("/admin/affiliate");
  };

  return (
    <div className="fixed inset-0 z-40 flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 w-80 shrink-0 h-full border-r bg-card transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <ConditionSidebar
          conditions={conditions}
          selectedConditionId={selectedCondition?.id ?? null}
          onSelectCondition={handleSelectCondition}
          onToggleStatus={handleToggleStatus}
          isLoading={isLoading}
          onBack={handleBack}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="shrink-0 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold truncate">
                  {selectedCondition?.title || "Select a Condition"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {selectedCondition?.name || "Choose from the sidebar"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {hasChanges && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs sm:text-sm text-amber-500 font-medium hidden sm:block"
                >
                  Unsaved changes
                </motion.span>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                size="sm"
                className="gap-1.5 sm:gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {editedCondition ? (
              <motion.div
                key={editedCondition.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ConditionEditor
                  condition={editedCondition}
                  onChange={handleFieldChange}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-full text-muted-foreground p-4 text-center"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading conditions...
                  </div>
                ) : (
                  "Select a condition from the sidebar to edit"
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
