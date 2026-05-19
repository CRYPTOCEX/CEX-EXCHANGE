import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { $serverFetch } from "@/lib/api";
import UserPortfolioClient from "./client";

interface UserPortfolioPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: UserPortfolioPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: user } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/creator/${id}` }
  );

  if (!user) {
    return {
      title: "User Not Found",
      description: "The requested user could not be found.",
    };
  }

  const displayName = user.displayName || `${user.firstName} ${user.lastName}`;

  return {
    title: `${displayName} | NFT Portfolio`,
    description: user.bio || `Explore ${displayName}'s NFT collection and creations`,
    openGraph: {
      title: displayName,
      description: user.bio || `Explore ${displayName}'s NFT collection and creations`,
      images: user.avatar ? [{ url: user.avatar }] : [],
      type: "profile",
    },
  };
}

export default async function UserPortfolioPage({ params }: UserPortfolioPageProps) {
  const { id } = await params;
  const { data: user, error } = await $serverFetch(
    { params: await params, headers: {} } as any,
    { url: `/api/nft/creator/${id}` }
  );

  if (error || !user) {
    notFound();
  }

  return <UserPortfolioClient initialUser={user} />;
} 