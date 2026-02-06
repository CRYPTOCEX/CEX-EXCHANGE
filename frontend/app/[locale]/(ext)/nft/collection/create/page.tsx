import type { Metadata } from "next";
import CreateCollectionClient from "./client";

export const metadata: Metadata = {
  title: "Create Collection - NFT Marketplace",
  description: "Create your NFT collection and deploy it to the blockchain",
};

export default function CreateCollectionPage() {
  return <CreateCollectionClient />;
}
