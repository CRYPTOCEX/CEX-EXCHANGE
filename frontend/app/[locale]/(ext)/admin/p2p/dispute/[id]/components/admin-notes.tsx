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
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

interface AdminNotesProps {
  dispute: any;
  noteText: string;
  setNoteText: (value: string) => void;
  handleAddNote: () => Promise<void>;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

export function AdminNotes({
  dispute,
  noteText,
  setNoteText,
  handleAddNote,
}: AdminNotesProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  // Get notes from dispute - could be adminNotes array or notes from timeline
  const adminNotes = dispute?.adminNotes || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCommon("admin_notes")}</CardTitle>
        <CardDescription>{t("internal_notes_about_this_dispute")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {adminNotes.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {adminNotes.map((note: any, index: number) => (
                <div key={index} className="rounded-md bg-muted p-3">
                  <p className="text-sm whitespace-pre-wrap">{note.content || note.message || note.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("added_by")} {note.createdBy || note.adminName || "Admin"}{" "}
                    {note.createdAt && `on ${formatDate(note.createdAt)}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t("no_admin_notes_yet")}
              </p>
            </div>
          )}
          <Textarea
            placeholder={t("add_a_note_about_this_dispute_ellipsis")}
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
            {tCommon("add_note")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
