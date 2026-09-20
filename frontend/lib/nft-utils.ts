/**
 * Get local NFT image URL using token ID
 * Images are stored as /uploads/nft/{tokenId}.jpg (or other extensions)
 * We default to .jpg but Next.js Image component handles format negotiation
 */
export function getNftImageUrl(tokenId: string | undefined, fallback = "/img/nft/placeholder.svg"): string {
  if (!tokenId) return fallback;
  return `/uploads/nft/${tokenId}.jpg`;
}
