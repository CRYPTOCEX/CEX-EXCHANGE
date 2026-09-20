"use client";

import type React from "react";
import { useState } from "react";
import { useBlogStore } from "@/store/blog/user";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useTranslations } from "next-intl";

interface CommentFormProps {
  postId: string;
  userId: string;
}

export function CommentForm({ postId, userId }: CommentFormProps) {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const [content, setContent] = useState("");
  const { addComment, isLoading } = useBlogStore();
  const { settings } = useConfigStore();

  // Gating logic: block unless user passes KYC & has comment_blog permission
  const gate = useKycGate("comment_blog");

  // Check if comments are moderated
  const moderateComments =
    settings?.moderateComments === "true" ||
    settings?.moderateComments === true;

  if (gate.state === "loading" || gate.state === "anonymous") {
    return null;
  }

  if (!gate.allowed) {
    return (
      <KycRequiredNotice
        feature="comment_blog"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await addComment(content, userId, postId);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      {/* `text-warning` on `bg-warning/10` is the exact tonal-chip pairing
          globals.css records as MEASURED failing AA (3.94-4.48): the 10% tint
          pulls the ground toward the ink. `-ink` is the derived tone that
          clears 4.5:1 against the tinted ground in both schemes. */}
      {moderateComments && (
        <div className="mb-4 p-3 bg-warning/10 dark:bg-warning/20 border border-warning/30 rounded-lg">
          <p className="text-sm text-warning-ink">
            <strong>{tCommon("note")}</strong>{" "}
            {t("comments_are_moderated_being_published")}
          </p>
        </div>
      )}
      <div className="mb-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`${t("write_a_comment")}…`}
          required
          rows={3}
          className="bg-muted border-border-strong"
        />
      </div>
      {/* The only two hardcoded English strings in a file where every other
          string goes through next-intl — on a page that ships in 90 locales.
          `common.submit`/`common.submitting` are present in all 90 (checked),
          so this needs no new message key. */}
      <Button type="submit" disabled={isLoading || !content.trim()}>
        {isLoading ? tCommon("submitting") : tCommon("submit")}
      </Button>
    </form>
  );
}
