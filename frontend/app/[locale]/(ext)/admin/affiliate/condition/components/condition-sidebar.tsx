"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  ArrowLeft,
  X,
} from "lucide-react";
import { Condition, CONDITION_TYPES, ConditionType, TypeConfig } from "./types";
import { cn } from "@/lib/utils";

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  icon: HelpCircle,
  color: "gray",
  bgGradient: "from-gray-500/20 to-gray-600/10",
  borderColor: "border-gray-500/30",
  textColor: "text-gray-600 dark:text-gray-400",
  label: "Unknown",
};

interface ConditionSidebarProps {
  conditions: Condition[];
  selectedConditionId: string | null;
  onSelectCondition: (condition: Condition) => void;
  onToggleStatus: (id: string, status: boolean) => void;
  isLoading: boolean;
  onBack: () => void;
  onClose: () => void;
}

export function ConditionSidebar({
  conditions,
  selectedConditionId,
  onSelectCondition,
  onToggleStatus,
  isLoading,
  onBack,
  onClose,
}: ConditionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(Object.keys(CONDITION_TYPES)));

  const filteredConditions = useMemo(() => {
    if (!searchQuery) return conditions;
    const query = searchQuery.toLowerCase();
    return conditions.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.type.toLowerCase().includes(query)
    );
  }, [conditions, searchQuery]);

  const groupedConditions = useMemo(() => {
    const groups: Record<string, Condition[]> = {};
    // Initialize with known types
    for (const type of Object.keys(CONDITION_TYPES)) {
      groups[type] = [];
    }
    // Group conditions by type (including unknown types)
    for (const condition of filteredConditions) {
      if (!groups[condition.type]) {
        groups[condition.type] = [];
      }
      groups[condition.type].push(condition);
    }
    return groups;
  }, [filteredConditions]);

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const activeCount = conditions.filter((c) => c.status).length;

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header with back button */}
      <div className="shrink-0 p-3 sm:p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-base sm:text-lg flex-1">Conditions</h2>
          <Badge variant="secondary" className="text-xs shrink-0">
            {activeCount}/{conditions.length}
          </Badge>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 h-8 w-8 lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conditions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Conditions List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : (
            Object.entries(groupedConditions).map(([type, typeConditions]) => {
              if (typeConditions.length === 0) return null;
              const config = CONDITION_TYPES[type as ConditionType] || { ...DEFAULT_TYPE_CONFIG, label: type };
              const Icon = config.icon;
              const isExpanded = expandedTypes.has(type);
              const activeInType = typeConditions.filter((c) => c.status).length;

              return (
                <div key={type} className="mb-2">
                  {/* Type Header */}
                  <button
                    onClick={() => toggleType(type)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className={cn("p-1.5 rounded shrink-0", `bg-${config.color}-500/10`)}>
                      <Icon className={cn("h-3.5 w-3.5", config.textColor)} />
                    </div>
                    <span className="font-medium text-sm flex-1 text-left truncate">
                      {config.label}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {activeInType}/{typeConditions.length}
                    </Badge>
                  </button>

                  {/* Conditions */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-4 sm:ml-6 space-y-1 mt-1"
                    >
                      {typeConditions.map((condition) => (
                        <div
                          key={condition.id}
                          onClick={() => onSelectCondition(condition)}
                          className={cn(
                            "flex items-center justify-between p-2 sm:p-2.5 rounded-lg cursor-pointer transition-all group",
                            selectedConditionId === condition.id
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                        >
                          <div className="min-w-0 flex-1 mr-2">
                            <p
                              className={cn(
                                "font-medium text-sm truncate",
                                !condition.status && "text-muted-foreground"
                              )}
                            >
                              {condition.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {condition.rewardType === "PERCENTAGE"
                                ? `${condition.reward}%`
                                : `$${condition.reward}`}{" "}
                              • {condition.rewardWalletType}
                            </p>
                          </div>
                          <Switch
                            checked={condition.status}
                            onCheckedChange={(checked) => {
                              onToggleStatus(condition.id, checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
