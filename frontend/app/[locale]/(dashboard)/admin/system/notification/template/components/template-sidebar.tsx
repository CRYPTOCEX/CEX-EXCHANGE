"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Wallet,
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Layers,
  Coins,
  UserCheck,
  MessageCircle,
  ShoppingCart,
  PenTool,
  Repeat,
  Settings,
  Mail,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import {
  templateCategories,
  groupTemplatesByCategory,
  type TemplateCategory,
} from "../config/template-categories";
import { useTranslations } from "next-intl";

export interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

interface TemplateSidebarProps {
  templates: NotificationTemplate[];
  selectedTemplateId: number | null;
  onSelectTemplate: (template: NotificationTemplate) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  wallet: Wallet,
  chart: BarChart3,
  users: Users,
  "trending-up": TrendingUp,
  "dollar-sign": DollarSign,
  layers: Layers,
  coins: Coins,
  "user-check": UserCheck,
  "message-circle": MessageCircle,
  "shopping-cart": ShoppingCart,
  "pen-tool": PenTool,
  repeat: Repeat,
  settings: Settings,
};

export function TemplateSidebar({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateSidebarProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(templateCategories.map((c) => c.id))
  );

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Group by category
  const groupedTemplates = useMemo(
    () => groupTemplatesByCategory(filteredTemplates),
    [filteredTemplates]
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getCategoryInfo = (categoryId: string): TemplateCategory | undefined => {
    return templateCategories.find((c) => c.id === categoryId);
  };

  // Format template name for display
  const formatTemplateName = (name: string): string => {
    // Convert PascalCase to readable format
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="flex h-full flex-col border-r bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/admin/system/notification" as any)}
            title={t("back_to_notification_service")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{t("email_templates")}</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search_templates_ellipsis")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{templates.length} templates</span>
          <span>•</span>
          <span>{Object.keys(groupedTemplates).length} categories</span>
        </div>
      </div>

      {/* Template List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {Object.entries(groupedTemplates).map(([categoryId, categoryTemplates]) => {
            const category = getCategoryInfo(categoryId);
            if (!category) return null;

            const Icon = iconMap[category.icon] || Mail;
            const isExpanded = expandedCategories.has(categoryId);

            return (
              <div key={categoryId} className="rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(categoryId)}
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/60 transition-colors rounded-lg"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm flex-1 text-left truncate">
                    {category.name}
                  </span>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {categoryTemplates.length}
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Category Templates */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pr-1 pb-1 space-y-0.5">
                        {categoryTemplates.map((template) => {
                          const isSelected = template.id === selectedTemplateId;
                          return (
                            <button
                              key={template.id}
                              onClick={() => onSelectTemplate(template)}
                              className={cn(
                                "w-full flex items-start gap-2 p-2.5 rounded-md text-left transition-all",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted/60"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-sm font-medium truncate",
                                      isSelected
                                        ? "text-primary-foreground"
                                        : "text-foreground"
                                    )}
                                  >
                                    {formatTemplateName(template.name)}
                                  </span>
                                </div>
                                <p
                                  className={cn(
                                    "text-xs truncate mt-0.5",
                                    isSelected
                                      ? "text-primary-foreground/80"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {template.subject}
                                </p>
                              </div>
                              {/* Status indicator */}
                              <div
                                className={cn(
                                  "shrink-0 flex items-center",
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                )}
                              >
                                {template.email ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <X className="h-3 w-3 text-muted-foreground/50" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {Object.keys(groupedTemplates).length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("no_templates_found")}</p>
              {searchQuery && (
                <p className="text-xs mt-1">{tCommon("try_a_different_search_term")}</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
