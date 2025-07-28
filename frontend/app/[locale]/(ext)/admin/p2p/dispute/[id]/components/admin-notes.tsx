"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
interface AdminNotesProps {
  dispute: any;
  noteText: string;
  setNoteText: (value: string) => void;
  handleAddNote: () => Promise<void>;
}
export function AdminNotes({
  dispute,
  noteText,
  setNoteText,
  handleAddNote,
}: AdminNotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Notes</CardTitle>
        <CardDescription>Internal notes about this dispute</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dispute.adminNotes && dispute.adminNotes.length > 0 ? (
            dispute.adminNotes.map((note: any, index: number) => {
              return (
                <div key={index} className="rounded-md bg-muted p-3">
                  <p className="text-sm">{note.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Added by {note.createdBy} on{" "}
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                Checked both bank statements. The transaction reference numbers
                don't match. Need to verify if this was a typo or intentional.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Added by Admin on Jul 5, 2023
              </p>
            </div>
          )}
          <Textarea
            placeholder="Add a note about this dispute..."
            className="min-h-[80px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button
            size="sm"
            className="w-full"
            onClick={handleAddNote}
            disabled={!noteText.trim()}
          >
            Add Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
