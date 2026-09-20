import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ShieldOff,
  FileX2,
  Search,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { m, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTableStore } from "../store";

/* This state REPLACES the skeleton rows the moment a request settles, so its
   entrance was on the load path like everything else: the icon rose from
   `y: 20` and the two lines of copy from `y: 15`, 150ms apart, into a block the
   skeleton had already sized. It mounts at rest now. The two decorative loops
   below survive — they are ongoing, not arrivals. */

// Subtle floating animation for the icon
const floatingAnimation = {
  y: [-2, 2, -2],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

interface NoDataStateProps {
  colSpan: number;
  type: "no-permission" | "no-results" | "filtered" | "error" | "loading";
  className?: string;
  isCard?: boolean;
}

export function NoDataState({ colSpan, type, className, isCard }: NoDataStateProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const clearFilters = useTableStore((s) => s.clearFilters);
  const fetchData = useTableStore((s) => s.fetchData);
  const goToCreate = useTableStore((s) => s.goToCreate);
  const tableConfig = useTableStore((s) => s.tableConfig);
  const hasCreatePermission = useTableStore((s) => s.hasCreatePermission);
  const reduceMotion = useReducedMotion();

  const stateConfig = {
    "no-permission": {
      icon: ShieldOff,
      message: t("you_dont_have_permission_to_view_this_data"),
      description: t("please_contact_your_administrator_for_access"),
    },
    "no-results": {
      icon: FileX2,
      message: tCommon("no_data_available"),
      description: t("there_are_no_items_to_display_at_this_time"),
    },
    filtered: {
      icon: Search,
      message: tCommon("no_matching_results"),
      description: tCommon("try_adjusting_your_search_or_filter_criteria"),
    },
    error: {
      icon: AlertTriangle,
      message: tCommon("an_error_occurred"),
      description: t("there_was_a_problem_fetching_the_data"),
    },
    loading: {
      icon: Loader2,
      message: t("loading_data"),
      description: t("please_wait_while_we_fetch_the_data"),
    },
  };

  const config = stateConfig[type];
  const Icon = config.icon;

  /**
   * EVERY EMPTY STATE CARRIES AN ACTION (ADMIN-SYSTEM R7).
   *
   * These five states used to be `{ icon, message, description }` and nothing
   * else, so an admin who filtered everything out read "Try adjusting your
   * search or filter criteria" with no way to clear them, and a failed fetch
   * said "There was a problem fetching the data" with no Retry — while the same
   * product's settings page already shipped a "Clear search" button for exactly
   * this situation.
   *
   * The actions are wired from the STORE rather than passed in as props, which
   * is what makes all 30 core admin tables and all 181 addon tables get them
   * without a single call site changing.
   */
  const action = (() => {
    if (type === "filtered") {
      return { label: tCommon("clear_filters") || tCommon("clear_filters"), onClick: clearFilters };
    }
    if (type === "error") {
      return { label: tCommon("retry") || tCommon("retry"), onClick: () => void fetchData() };
    }
    // "Create the first X" only when this table can actually create one — an
    // empty table the operator has no permission to add to should not offer it.
    if (type === "no-results" && tableConfig?.canCreate && hasCreatePermission) {
      return {
        label: `${tCommon("create")} ${tableConfig.itemTitle || ""}`.trim(),
        onClick: goToCreate,
      };
    }
    return null;
  })();

  // Card view content (without table wrapper)
  const content = (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      {/* Both loops below are DECORATIVE and both are `repeat: Infinity`, which
          ADMIN-SYSTEM R12 bans outside a live-status indicator. They are gated
          rather than deleted because they carry the empty state's only visual
          interest — but they must respect `useReducedMotion`, because the global
          `MotionConfig reducedMotion="user"` only stops transform and layout
          animation and explicitly KEEPS opacity and colour running. A user who
          asked for reduced motion was still getting a pulsing halo forever. */}
      <m.div
        animate={type !== "loading" && !reduceMotion ? floatingAnimation : undefined}
        className="relative"
      >
        <m.div
          className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-20",
            type === "error" ? "bg-destructive" : "bg-muted-foreground"
          )}
          animate={
            reduceMotion
              ? undefined
              : { scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <Icon
          className={cn(
            "h-12 w-12 text-muted-foreground relative z-10",
            type === "loading" && "animate-spin"
          )}
        />
      </m.div>
      <div className="space-y-2 max-w-[250px] flex items-center justify-center flex-col">
        <p className="text-lg font-medium text-foreground text-center">
          {config.message}
        </p>
        <p className="text-sm text-muted-foreground text-center">
          {config.description}
        </p>
        {action && (
          <Button variant="outline" size="sm" onClick={action.onClick} className="mt-2">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );

  // For card view, return content directly without table wrapper
  if (isCard) {
    return (
      <div className={cn("h-[300px] flex items-center justify-center", className)}>
        {content}
      </div>
    );
  }

  // For table view, wrap in TableRow/TableCell
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn("h-[400px] text-center", className)}
      >
        {content}
      </TableCell>
    </TableRow>
  );
}
