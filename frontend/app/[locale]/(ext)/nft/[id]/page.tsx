import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { $serverFetch } from "@/lib/api";
import ErrorBoundary from "@/components/error-boundary";
import NFTDetailClient from "./client";

interface NFTDetailPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: NFTDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: token } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/token/${id}` }
  );

  if (!token) {
    return {
      title: "NFT Not Found",
      description: "The requested NFT could not be found.",
    };
  }

  return {
    title: `${token.name} | NFT Marketplace`,
    description: token.description || `${token.name} from ${token.collection?.name || 'Unknown Collection'}`,
    openGraph: {
      title: token.name,
      description: token.description || `${token.name} from ${token.collection?.name || 'Unknown Collection'}`,
      images: token.image ? [{ url: token.image }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: token.name,
      description: token.description || `${token.name} from ${token.collection?.name || 'Unknown Collection'}`,
      images: token.image ? [token.image] : [],
    },
  };
}

export default async function NFTDetailPage({ params }: NFTDetailPageProps) {
  const { id } = await params;
  const { data: token, error } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/token/${id}` }
  );

  if (error || !token) {
    notFound();
  }

  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        console.error('NFT Detail Error:', error, errorInfo);
        // In production, send to error tracking service
      }}
    >
      <NFTDetailClient initialToken={token} />
    </ErrorBoundary>
  );
} 