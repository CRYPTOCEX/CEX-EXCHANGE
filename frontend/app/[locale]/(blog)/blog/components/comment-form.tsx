"use client";

import type React from "react";
import { useState } from "react";
import { useBlogStore } from "@/store/blog/user";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

interface CommentFormProps {
  postId: string;
  userId: string;
}

export function CommentForm({ postId, userId }: CommentFormProps) {
  const t = useTranslations("blog");
  const [content, setContent] = useState("");
  const { addComment, isLoading } = useBlogStore();
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  // Gating logic: block unless user passes KYC & has comment_blog permission
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("comment_blog");

  // Check if comments are moderated
  const moderateComments =
    settings?.moderateComments === "true" ||
    settings?.moderateComments === true;

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="comment_blog" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await addComment(content, userId, postId);
    setContent("untitled");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      {moderateComments && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>{t("note")}</strong>
            {t("comments_are_moderated_being_published")}
          </p>
        </div>
      )}
      <div className="mb-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          required
          rows={3}
          className="dark:bg-zinc-800 dark:border-zinc-700"
        />
      </div>
      <Button type="submit" disabled={isLoading || !content.trim()}>
        {isLoading ? "Submitting..." : "Post Comment"}
      </Button>
    </form>
  );
}
