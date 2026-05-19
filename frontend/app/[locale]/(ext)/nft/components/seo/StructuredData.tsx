"use client";

import { useEffect } from "react";

interface NFTMarketplaceData {
  name: string;
  description: string;
  url: string;
  logo?: string;
  contactEmail?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

interface StructuredDataProps {
  data?: NFTMarketplaceData;
}

export default function StructuredData({ data }: StructuredDataProps) {
  const defaultData: NFTMarketplaceData = {
    name: "NFT Market",
    description:
      "The world's first and largest digital marketplace for crypto collectibles and non-fungible tokens. Buy, sell, and discover exclusive digital items.",
    url: typeof window !== "undefined" ? window.location.origin : "",
    logo: "/img/logo.png",
    contactEmail: "support@nftmarket.com",
    socialLinks: {
      twitter: "https://twitter.com/nftmarket",
      discord: "https://discord.gg/nftmarket",
      telegram: "https://t.me/nftmarket",
    },
  };

  const marketplaceData = { ...defaultData, ...data };

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Website
      {
        "@type": "WebSite",
        "@id": `${marketplaceData.url}/#website`,
        url: marketplaceData.url,
        name: marketplaceData.name,
        description: marketplaceData.description,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${marketplaceData.url}/nft/marketplace?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      // Organization
      {
        "@type": "Organization",
        "@id": `${marketplaceData.url}/#organization`,
        name: marketplaceData.name,
        url: marketplaceData.url,
        logo: {
          "@type": "ImageObject",
          url: `${marketplaceData.url}${marketplaceData.logo}`,
        },
        description: marketplaceData.description,
        contactPoint: {
          "@type": "ContactPoint",
          email: marketplaceData.contactEmail,
          contactType: "customer service",
        },
        sameAs: Object.values(marketplaceData.socialLinks || {}).filter(Boolean),
      },
      // Marketplace
      {
        "@type": "WebPage",
        "@id": `${marketplaceData.url}/nft/#webpage`,
        url: `${marketplaceData.url}/nft`,
        name: `${marketplaceData.name} - NFT Marketplace`,
        description: marketplaceData.description,
        isPartOf: {
          "@id": `${marketplaceData.url}/#website`,
        },
        about: {
          "@id": `${marketplaceData.url}/#organization`,
        },
        breadcrumb: {
          "@id": `${marketplaceData.url}/nft/#breadcrumb`,
        },
      },
      // Breadcrumb
      {
        "@type": "BreadcrumbList",
        "@id": `${marketplaceData.url}/nft/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: marketplaceData.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "NFT Marketplace",
            item: `${marketplaceData.url}/nft`,
          },
        ],
      },
      // Product (NFT Marketplace as a service)
      {
        "@type": "Product",
        name: `${marketplaceData.name} NFT Trading Platform`,
        description: "Multi-chain NFT marketplace supporting Ethereum, BSC, Polygon and more",
        brand: {
          "@type": "Brand",
          name: marketplaceData.name,
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "ETH",
          lowPrice: "0.01",
          highPrice: "100000",
          offerCount: "1000000",
        },
      },
    ],
  };

  useEffect(() => {
    // Add structured data to document head
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    script.id = "nft-structured-data";

    // Remove existing structured data if any
    const existing = document.getElementById("nft-structured-data");
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
