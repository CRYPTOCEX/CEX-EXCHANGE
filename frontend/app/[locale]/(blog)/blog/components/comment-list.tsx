"use client";

import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";
import { publicShortName } from "@/utils/display-name";
import { m } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { AvatarPresenceDot, presenceOf } from "@/components/ui/presence";

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { comments, fetchComments } = useBlogStore();

  /* `[]` here, with `postId` read inside, meant the fetch ran once for whatever
     post happened to mount first. App Router reuses this component across
     /blog/a -> /blog/b (same route segment, no unmount), so the second article
     rendered the FIRST article's comment thread under it and never corrected
     itself. Keyed on postId it refetches per article. */
  useEffect(() => {
    if (postId) fetchComments(postId);
  }, [postId, fetchComments]);

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/50 dark:bg-surface-2/50 rounded-2xl border border-border">
        <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground text-lg">
          {t("no_comments_yet")}
        </p>
        <p className="text-subtle-foreground text-sm mt-1">
          {t("be_the_first_to_comment")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment, index) => (
        <m.div
          key={comment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex gap-4 p-5 bg-card rounded-lg border border-border hover:border-primary dark:hover:border-primary/50 transition-colors duration-300"
        >
          <div className="shrink-0">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-primary/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image
                className="relative h-12 w-12 rounded-full object-cover ring-2 ring-card"
                src={comment.user?.avatar || "/img/placeholder.svg"}
                alt={publicShortName(comment.user, tCommon("anonymous"))}
                width={48}
                height={48}
              />
              {/* `presence` is a BUCKET, not a timestamp — see
                  `backend/src/utils/presence.ts`. A commenter published a
                  comment, not their working hours, so the page can say whether
                  they are around and deliberately cannot say since when. */}
              <AvatarPresenceDot state={presenceOf(comment.user)} size="sm" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold text-foreground">
                {publicShortName(comment.user, tCommon("anonymous"))}
              </h4>
              {comment.createdAt && (
                <span className="text-xs text-subtle-foreground bg-muted px-2 py-0.5 rounded-full">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {comment.content}
            </div>
          </div>
        </m.div>
      ))}
    </div>
  );
}
