"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

// State & Utils
import { useTableStore } from "../../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../../utils/permissions";

// Actions
import { ViewAction } from "./view";
import { EditAction } from "./edit";
import { DeleteAction } from "./delete";
import { RestoreAction } from "./restore";
import { PermanentDeleteAction } from "./permanent-delete";

interface RowActionsProps {
  row: any;
}

export function RowActions({ row }: RowActionsProps) {
  const hasViewPermission = useTableStore((state) => state.hasViewPermission);
  const permissions = useTableStore((state) => state.permissions);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const user = useUserStore((state) => state.user);

  const [open, setOpen] = React.useState(false);

  const isDeleted = Boolean(row.deletedAt);

  // 1) Check if we have a "view" action
  const hasViewAction =
    !!(tableConfig.viewLink || tableConfig.onViewClick) && hasViewPermission;

  // 2) Evaluate the optional "editCondition" from the table config
  const meetsEditCondition =
    typeof tableConfig.editCondition === "function"
      ? tableConfig.editCondition(row)
      : true;

  // 3) Check the user's actual permission (handles Super Admin, etc.)
  const userHasEditPermission = checkPermission(user, permissions?.edit);

  // 4) Combine all logic to determine if we *can* edit
  const canEditAction =
    tableConfig.canEdit &&
    userHasEditPermission &&
    meetsEditCondition &&
    !isDeleted;

  // 5) Decide if we should even show an "Edit" menu item
  //    You might prefer to show a disabled item, but here we only show it if
  //    the table config + permissions say we have an "edit" action.
  const hasEditAction =
    tableConfig.canEdit && permissions?.edit && meetsEditCondition;

  // 6) Check if a delete action is available
  const userHasDeletePermission = checkPermission(user, permissions?.delete);
  const hasDeleteAction = tableConfig.canDelete && userHasDeletePermission;

  // 7) If there's no view, edit, or delete, hide the entire menu
  const hasAnyAction = hasViewAction || hasEditAction || hasDeleteAction;
  if (!hasAnyAction) {
    return null;
  }

  // 8) Show a separator only if we have a top action (view/edit)
  //    AND a bottom action (delete).
  const showSeparator = (hasViewAction || hasEditAction) && hasDeleteAction;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={tableConfig.extraRowActions ? "w-56" : "w-[160px]"}
      >
        {/* View Action */}
        {hasViewAction && (
          <ViewAction row={row} onSelect={() => setOpen(false)} />
        )}

        {/* Edit Action - pass canEditAction to handle enabling/disabling */}
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
