"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { Clock, ArrowUpRight } from "lucide-react";

interface BlogCardProps {
  post: Post;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg hover:shadow-2xl transition-all duration-500">
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />

      {/* Image Section */}
      <div className="relative h-52 w-full overflow-hidden">
        <Link href={`/blog/${post.slug}`}>
          <Image
            src={post.image || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
        </Link>

        {/* Category Badge */}
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-zinc-800 transition-colors duration-300 shadow-lg border border-white/20"
          >
            {post.category.name}
          </Link>
        )}

        {/* Hover arrow */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <div className="w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
            <ArrowUpRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative flex flex-1 flex-col p-6 z-10">
        <Link href={`/blog/${post.slug}`} className="block flex-1">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 mb-3">
            {post.title}
          </h3>
          {post.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
              {post.description}
            </p>
          )}
        </Link>

        {/* Author & Date */}
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          {post.author?.user && (
            <Link
              href={`/blog/author/${post.author.id}`}
              className="flex items-center gap-3 group/author"
            >
              <div className="relative">
                <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-purple-500 rounded-full opacity-0 group-hover/author:opacity-75 blur-sm transition-opacity duration-300" />
                <Image
                  className="relative h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
                  src={post.author.user.avatar || "/img/placeholder.svg"}
                  alt={post.author.user.firstName || "Author"}
                  width={36}
                  height={36}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white group-hover/author:text-indigo-600 dark:group-hover/author:text-indigo-400 transition-colors duration-300">
                  {post.author.user.firstName}
                </p>
              </div>
            </Link>
          )}
          {post.createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              <time dateTime={post.createdAt.toString()}>
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </time>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
