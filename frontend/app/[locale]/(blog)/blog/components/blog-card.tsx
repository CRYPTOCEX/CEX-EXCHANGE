"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";

interface BlogCardProps {
  post: Post;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:shadow-xl bg-white dark:bg-zinc-800 dark:border dark:border-zinc-700">
      <div className="relative h-48 w-full overflow-hidden">
        <Link href={`/blog/${post.slug}`}>
          <Image
            src={post.image || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-70 group-hover:opacity-80 transition-opacity duration-300"></div>
        </Link>
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="absolute left-4 top-4 rounded-full bg-indigo-600/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-indigo-500 transition-colors duration-300 shadow-md"
          >
            {post.category.name}
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="flex-1">
          <Link href={`/blog/${post.slug}`} className="mt-2 block">
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2">
              {post.title}
            </h3>
            {post.description && (
              <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {post.description}
              </p>
            )}
          </Link>
        </div>
        <div className="mt-6 flex items-center">
          {post.author?.user && (
            <div className="flex-shrink-0">
              <Link href={`/blog/author/${post.author.id}`}>
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-75 blur-sm"></div>
                  <Image
                    className="relative h-10 w-10 rounded-full"
                    src={post.author.user.avatar || "/img/placeholder.svg"}
                    alt={post.author.user.firstName || "Author"}
                    width={40}
                    height={40}
                  />
                </div>
              </Link>
            </div>
          )}
          <div className="ml-3">
            {post.author?.user && (
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {post.author.user.firstName}
              </p>
            )}
            {post.createdAt && (
              <div className="flex space-x-1 text-sm text-zinc-500 dark:text-zinc-400">
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
    </div>
  );
}
