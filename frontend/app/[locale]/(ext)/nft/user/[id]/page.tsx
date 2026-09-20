import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { $serverFetch } from "@/lib/api";
import { publicName } from "@/utils/display-name";
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

  /* This was `${user.firstName} ${user.lastName}`, reading the WRONG OBJECT:
     the name fields live on the nested `user`, never on the creator row. So
     every creator without a chosen display name was titled, verbatim,
     "undefined undefined" — in `title`, in `og:title` and in the description,
     which is what crawlers and link previews actually picked up.

     Correcting the path alone would have turned a cosmetic bug into a real
     leak, because this endpoint served the surname unredacted. Both halves had
     to move at once: read the right object, and read it through the ladder. */
  const displayName =
    String(user.displayName ?? "").trim() || publicName(user.user, "NFT Creator");

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