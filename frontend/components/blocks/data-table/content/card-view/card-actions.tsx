"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { motion } from "framer-motion";

// State & Utils
import { useTableStore } from "../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../utils/permissions";

// Actions - reuse from table rows
import { ViewAction } from "../rows/actions/view";
import { EditAction } from "../rows/actions/edit";
import { DeleteAction } from "../rows/actions/delete";
import { RestoreAction } from "../rows/actions/restore";
import { PermanentDeleteAction } from "../rows/actions/permanent-delete";

// Button animation variants
const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.9 },
};

interface CardActionsProps {
  row: any;
}

export function CardActions({ row }: CardActionsProps) {
  const hasViewPermission = useTableStore((state) => state.hasViewPermission);
  const permissions = useTableStore((state) => state.permissions);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const user = useUserStore((state) => state.user);

  const [open, setOpen] = React.useState(false);

  const isDeleted = Boolean(row.deletedAt);

  // Check if we have a "view" action
  const hasViewAction =
    !!(tableConfig.viewLink || tableConfig.onViewClick) && hasViewPermission;

  // Evaluate the optional "editCondition" from the table config
  const meetsEditCondition =
    typeof tableConfig.editCondition === "function"
      ? tableConfig.editCondition(row)
      : true;

  // Check the user's actual permission
  const userHasEditPermission = checkPermission(user, permissions?.edit);

  // Combine all logic to determine if we *can* edit
  const canEditAction =
    tableConfig.canEdit &&
    userHasEditPermission &&
    meetsEditCondition &&
    !isDeleted;

  // Decide if we should show an "Edit" menu item
  const hasEditAction =
    tableConfig.canEdit && permissions?.edit && meetsEditCondition;

  // Check if a delete action is available
  const userHasDeletePermission = checkPermission(user, permissions?.delete);
  const hasDeleteAction = tableConfig.canDelete && userHasDeletePermission;

  // If there's no view, edit, or delete, hide the entire menu
  const hasAnyAction = hasViewAction || hasEditAction || hasDeleteAction;
  if (!hasAnyAction) {
    return null;
  }

  // Show a separator only if we have a top action AND a bottom action
  const showSeparator = (hasViewAction || hasEditAction) && hasDeleteAction;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.div
          variants={buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button variant="ghost" className="h-7 w-7 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </motion.div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={tableConfig.extraRowActions ? "w-56" : "w-[160px]"}
      >
        {/* View Action */}
        {hasViewAction && (
          <ViewAction row={row} onSelect={() => setOpen(false)} />
        )}

        {/* Edit Action */}
        {hasEditAction && (
          <EditAction
            row={row}
            onSelect={() => setOpen(false)}
            canEditAction={canEditAction}
          />
        )}

        {/* Delete / Restore / Permanent Delete */}
        {hasDeleteAction && (
          <>
            {showSeparator && <DropdownMenuSeparator />}
            {isDeleted ? (
              <>
                <PermanentDeleteAction
                  row={row}
                  onSelect={() => setOpen(false)}
                />
                <RestoreAction row={row} onSelect={() => setOpen(false)} />
              </>
            ) : (
              <DeleteAction row={row} onSelect={() => setOpen(false)} />
            )}
          </>
        )}

        {tableConfig.extraRowActions && tableConfig.extraRowActions(row)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
