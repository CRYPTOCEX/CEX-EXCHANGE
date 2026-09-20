"use client";

import { useParams } from "next/navigation";
import { PostEditor } from "@/components/blocks/blog/post-editor";

export function EditPostClient() {
  const { id } = useParams() as { id: string };
  return <PostEditor scope="author" postId={id} />;
}
