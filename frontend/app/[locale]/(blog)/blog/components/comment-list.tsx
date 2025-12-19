"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const t = useTranslations("blog_blog");
  const { comments, fetchComments } = useBlogStore();

  useEffect(() => {
    if (postId) fetchComments(postId);
  }, []);

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
        <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center">
          <MessageCircle className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-lg">
          {t("no_comments_yet")}
        </p>
        <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1">
          {t("be_the_first_to_comment")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment, index) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors duration-300"
        >
          <div className="shrink-0">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image
                className="relative h-12 w-12 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
                src={comment.user?.avatar || "/img/placeholder.svg"}
                alt={comment.user?.firstName || "Anonymous"}
                width={48}
                height={48}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {comment.user?.firstName} {comment.user?.lastName}
              </h4>
              {comment.createdAt && (
                <span className="text-xs text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
            <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
              {comment.content}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
