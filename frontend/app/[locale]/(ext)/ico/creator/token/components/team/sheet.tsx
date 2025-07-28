"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TeamMemberForm } from "./form";

type TeamMemberSheetProps = {
  isOpen: boolean;
  tokenId: string;
  member?: icoTeamMemberAttributes; // if undefined then it's for adding a new team member
  onSuccess: () => void;
  onCancel: () => void;
};

export default function TeamMemberSheet({
  isOpen,
  tokenId,
  member,
  onSuccess,
  onCancel,
}: TeamMemberSheetProps) {
  const title = member ? "Edit Team Member" : "Add Team Member";
  const description = member
    ? "Update the details of your team member."
    : "Fill in the details for your new team member.";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <TeamMemberForm
          tokenId={tokenId}
          member={member}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </SheetContent>
    </Sheet>
  );
}
