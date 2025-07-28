"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const t = useTranslations("blog");
  const { comments, fetchComments } = useBlogStore();

  useEffect(() => {
    if (postId) fetchComments(postId);
  }, []);

  if (comments.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-zinc-500 dark:text-zinc-400">
          {t("no_comments_yet")} {t("be_the_first_to_comment")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <div key={comment.id} className="flex space-x-4">
          <div className="flex-shrink-0">
            <Image
              className="h-10 w-10 rounded-full"
              src={comment.user?.avatar || "/img/placeholder.svg"}
              alt={comment.user?.firstName || "Anonymous"}
              width={40}
              height={40}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {comment.user?.firstName} {comment.user?.lastName}
              </h4>
              {comment.createdAt && (
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
              {comment.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
