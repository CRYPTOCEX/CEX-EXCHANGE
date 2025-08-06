"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftOfferAnalytics } from "./analytics";

export default function NFTOffersPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/offer"
      model="nftOffer"
      permissions={{
        access: "access.nft.offer",
        view: "view.nft.offer",
        create: "create.nft.offer",
        edit: "edit.nft.offer",
        delete: "delete.nft.offer",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Offers & Bids"
      itemTitle="Offer"
      description="Monitor and manage NFT offers, bids, and marketplace negotiations"
      columns={columns}
      analytics={nftOfferAnalytics}
    />
  );
}