import { notFound } from "next/navigation";
import { $serverFetch } from "@/lib/api";
import PublicCreatorClient from "./client";

interface CreatorPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function PublicCreatorPage({ params }: CreatorPageProps) {
  const { id } = await params;
  const { data: creator, error } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/creator/${id}` }
  );

  if (error || !creator) {
    notFound();
  }

  return <PublicCreatorClient creatorId={id} />;
} 