import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { $serverFetch } from "@/lib/api";
import CollectionDetailClient from "./client";

interface CollectionDetailPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: CollectionDetailPageProps): Promise<Metadata> {
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
    title: `${collection.name} | NFT Collection`,
    description: collection.description || `Explore the ${collection.name} NFT collection`,
    openGraph: {
      title: collection.name,
      description: collection.description || `Explore the ${collection.name} NFT collection`,
      images: collection.image ? [{ url: collection.image }] : [],
      type: "website",
    },
  };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { id } = await params;
  const { data: collection, error } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/collection/${id}` }
  );

  if (error || !collection) {
    notFound();
  }

  return <CollectionDetailClient initialCollection={collection} />;
} 