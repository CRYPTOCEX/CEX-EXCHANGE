import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { $serverFetch } from "@/lib/api";
import EditCollectionClient from "./client";

interface EditCollectionPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: EditCollectionPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: collection } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/collection/${id}` }
  );

  if (!collection) {
    return {
      title: "Collection Not Found",
      description: "The requested collection could not be found.",
    };
  }

  return {
    title: `Edit ${collection.name} | NFT Collection`,
    description: `Edit your ${collection.name} NFT collection`,
  };
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
  const { id } = await params;
  const { data: collection, error } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/collection/${id}` }
  );

  if (error || !collection) {
    notFound();
  }

  return <EditCollectionClient initialCollection={collection} />;
}
