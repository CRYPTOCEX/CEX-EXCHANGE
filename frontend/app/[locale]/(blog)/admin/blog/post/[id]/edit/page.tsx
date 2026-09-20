"use client";

import { useParams } from "next/navigation";
import { PostEditor } from "@/components/blocks/blog/post-editor";

export default function EditPostPage() {
  const { id } = useParams() as { id: string };
  return <PostEditor scope="admin" postId={id} />;
}
