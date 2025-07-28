// NFT Category
interface nftCategoryAttributes {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftCategoryPk = "id";
type nftCategoryId = nftCategoryAttributes[nftCategoryPk];
type nftCategoryOptionalAttributes =
  | "id"
  | "description"
  | "image"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftCategoryCreationAttributes = Optional<
  nftCategoryAttributes,
  nftCategoryOptionalAttributes
>;

// NFT Collection
interface nftCollectionAttributes {
  id: string;
  name: string;
  slug: string;
  description?: string;
  symbol: string;
  contractAddress?: string;
  chain: string;
  network: string;
  standard: "ERC721" | "ERC1155";
  totalSupply?: number;
  maxSupply?: number;
  mintPrice?: number;
  currency?: string;
  royaltyPercentage?: number;
  royaltyAddress?: string;
  creatorId: string;
  categoryId?: string;
  bannerImage?: string;
  logoImage?: string;
  featuredImage?: string;
  website?: string;
  discord?: string;
  twitter?: string;
  telegram?: string;
  isVerified?: boolean;
  isLazyMinted?: boolean;
  status: "DRAFT" | "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  stakingRewardRate?: number;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftCollectionPk = "id";
type nftCollectionId = nftCollectionAttributes[nftCollectionPk];
type nftCollectionOptionalAttributes =
  | "id"
  | "description"
  | "contractAddress"
  | "totalSupply"
  | "maxSupply"
  | "mintPrice"
  | "currency"
  | "royaltyPercentage"
  | "royaltyAddress"
  | "categoryId"
  | "bannerImage"
  | "logoImage"
  | "featuredImage"
  | "website"
  | "discord"
  | "twitter"
  | "telegram"
  | "isVerified"
  | "isLazyMinted"
  | "status"
  | "stakingRewardRate"
  | "metadata"
  | "network"
  | "standard"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftCollectionCreationAttributes = Optional<
  nftCollectionAttributes,
  nftCollectionOptionalAttributes
>;

// NFT Token
interface nftTokenAttributes {
  id: string;
  collectionId: string;
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: any;
  metadataUri?: string;
  metadataHash?: string;
  ownerId?: string;
  creatorId: string;
  mintedAt?: Date;
  isMinted: boolean;
  isListed: boolean;
  views?: number;
  likes?: number;
  rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  rarityScore?: number;
  status: "DRAFT" | "MINTED" | "BURNED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftTokenPk = "id";
type nftTokenId = nftTokenAttributes[nftTokenPk];
type nftTokenOptionalAttributes =
  | "id"
  | "description"
  | "image"
  | "animationUrl"
  | "externalUrl"
  | "attributes"
  | "metadataUri"
  | "metadataHash"
  | "ownerId"
  | "mintedAt"
  | "isMinted"
  | "isListed"
  | "views"
  | "likes"
  | "rarity"
  | "rarityScore"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftTokenCreationAttributes = Optional<
  nftTokenAttributes,
  nftTokenOptionalAttributes
>;

// NFT Listing
interface nftListingAttributes {
  id: string;
  tokenId: string;
  sellerId: string;
  type: "FIXED_PRICE" | "AUCTION" | "BUNDLE";
  price?: number;
  currency: string;
  reservePrice?: number;
  buyNowPrice?: number;
  startTime?: Date;
  endTime?: Date;
  status: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
  views?: number;
  likes?: number;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftListingPk = "id";
type nftListingId = nftListingAttributes[nftListingPk];
type nftListingOptionalAttributes =
  | "id"
  | "price"
  | "currency"
  | "reservePrice"
  | "buyNowPrice"
  | "startTime"
  | "endTime"
  | "status"
  | "views"
  | "likes"
  | "metadata"
  | "type"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftListingCreationAttributes = Optional<
  nftListingAttributes,
  nftListingOptionalAttributes
>;

// NFT Activity
interface nftActivityAttributes {
  id: string;
  type: "MINT" | "TRANSFER" | "SALE" | "LIST" | "DELIST" | "BID" | "OFFER" | "BURN";
  tokenId?: string;
  collectionId?: string;
  listingId?: string;
  fromUserId?: string;
  toUserId?: string;
  price?: number;
  currency?: string;
  transactionHash?: string;
  blockNumber?: number;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftActivityPk = "id";
type nftActivityId = nftActivityAttributes[nftActivityPk];
type nftActivityOptionalAttributes =
  | "id"
  | "tokenId"
  | "collectionId"
  | "listingId"
  | "fromUserId"
  | "toUserId"
  | "price"
  | "currency"
  | "transactionHash"
  | "blockNumber"
  | "metadata"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftActivityCreationAttributes = Optional<
  nftActivityAttributes,
  nftActivityOptionalAttributes
>;

// NFT Bid
interface nftBidAttributes {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  currency: string;
  expiresAt?: Date;
  status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftBidPk = "id";
type nftBidId = nftBidAttributes[nftBidPk];
type nftBidOptionalAttributes =
  | "id"
  | "currency"
  | "expiresAt"
  | "status"
  | "metadata"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftBidCreationAttributes = Optional<
  nftBidAttributes,
  nftBidOptionalAttributes
>;

// NFT Offer
interface nftOfferAttributes {
  id: string;
  tokenId?: string;
  collectionId?: string;
  listingId?: string;
  offererId: string;
  amount: number;
  currency: string;
  expiresAt?: Date;
  status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftOfferPk = "id";
type nftOfferId = nftOfferAttributes[nftOfferPk];
type nftOfferOptionalAttributes =
  | "id"
  | "tokenId"
  | "collectionId"
  | "listingId"
  | "currency"
  | "expiresAt"
  | "status"
  | "metadata"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftOfferCreationAttributes = Optional<
  nftOfferAttributes,
  nftOfferOptionalAttributes
>;

// NFT Sale
interface nftSaleAttributes {
  id: string;
  tokenId: string;
  listingId?: string;
  sellerId: string;
  buyerId: string;
  price: number;
  currency: string;
  marketplaceFee: number;
  royaltyFee: number;
  totalFee: number;
  netAmount: number;
  transactionHash?: string;
  blockNumber?: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftSalePk = "id";
type nftSaleId = nftSaleAttributes[nftSalePk];
type nftSaleOptionalAttributes =
  | "id"
  | "listingId"
  | "currency"
  | "transactionHash"
  | "blockNumber"
  | "status"
  | "metadata"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftSaleCreationAttributes = Optional<
  nftSaleAttributes,
  nftSaleOptionalAttributes
>;

// NFT Favorite
interface nftFavoriteAttributes {
  id: string;
  userId: string;
  tokenId?: string;
  collectionId?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftFavoritePk = "id";
type nftFavoriteId = nftFavoriteAttributes[nftFavoritePk];
type nftFavoriteOptionalAttributes =
  | "id"
  | "tokenId"
  | "collectionId"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftFavoriteCreationAttributes = Optional<
  nftFavoriteAttributes,
  nftFavoriteOptionalAttributes
>;

// NFT Creator Profile
interface nftCreatorAttributes {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  banner?: string;
  isVerified: boolean;
  verificationTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  totalSales?: number;
  totalVolume?: number;
  totalItems?: number;
  floorPrice?: number;
  profilePublic?: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftCreatorPk = "id";
type nftCreatorId = nftCreatorAttributes[nftCreatorPk];
type nftCreatorOptionalAttributes =
  | "id"
  | "displayName"
  | "bio"
  | "banner"
  | "isVerified"
  | "verificationTier"
  | "totalSales"
  | "totalVolume"
  | "totalItems"
  | "floorPrice"
  | "profilePublic"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftCreatorCreationAttributes = Optional<
  nftCreatorAttributes,
  nftCreatorOptionalAttributes
>;

// Extended interfaces with relations
interface nftCollection extends nftCollectionAttributes {
  creator?: userAttributes;
  category?: nftCategoryAttributes;
  tokens?: nftTokenAttributes[];
  activities?: nftActivityAttributes[];
  totalVolume?: number;
  floorPrice?: number;
  owners?: number;
  listed?: number;
}

interface nftToken extends nftTokenAttributes {
  collection?: nftCollectionAttributes;
  owner?: userAttributes;
  creator?: userAttributes;
  listings?: nftListingAttributes[];
  activities?: nftActivityAttributes[];
  favorites?: nftFavoriteAttributes[];
  currentListing?: nftListingAttributes;
  lastSale?: nftSaleAttributes;
}

interface nftListing extends nftListingAttributes {
  token?: nftTokenAttributes;
  seller?: userAttributes;
  bids?: nftBidAttributes[];
  offers?: nftOfferAttributes[];
  activities?: nftActivityAttributes[];
  highestBid?: nftBidAttributes;
  timeLeft?: number;
}

interface nftActivity extends nftActivityAttributes {
  token?: nftTokenAttributes;
  collection?: nftCollectionAttributes;
  listing?: nftListingAttributes;
  fromUser?: userAttributes;
  toUser?: userAttributes;
}

// NFT Review
interface nftReviewAttributes {
  id: string;
  userId: string;
  tokenId?: string;
  collectionId?: string;
  creatorId?: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified?: boolean;
  helpfulCount?: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftReviewPk = "id";
type nftReviewId = nftReviewAttributes[nftReviewPk];
type nftReviewOptionalAttributes =
  | "id"
  | "tokenId"
  | "collectionId"
  | "creatorId"
  | "title"
  | "comment"
  | "isVerified"
  | "helpfulCount"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftReviewCreationAttributes = Optional<
  nftReviewAttributes,
  nftReviewOptionalAttributes
>;

// NFT Royalty
interface nftRoyaltyAttributes {
  id: string;
  saleId: string;
  tokenId: string;
  collectionId: string;
  recipientId: string;
  amount: number;
  percentage: number;
  currency: string;
  transactionHash?: string;
  blockNumber?: number;
  status: "PENDING" | "PAID" | "FAILED";
  paidAt?: Date;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftRoyaltyPk = "id";
type nftRoyaltyId = nftRoyaltyAttributes[nftRoyaltyPk];
type nftRoyaltyOptionalAttributes =
  | "id"
  | "transactionHash"
  | "blockNumber"
  | "status"
  | "paidAt"
  | "metadata"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftRoyaltyCreationAttributes = Optional<
  nftRoyaltyAttributes,
  nftRoyaltyOptionalAttributes
>;

// NFT Creator Follow
interface nftCreatorFollowAttributes {
  id: string;
  followerId: string;
  followingId: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type nftCreatorFollowPk = "id";
type nftCreatorFollowId = nftCreatorFollowAttributes[nftCreatorFollowPk];
type nftCreatorFollowOptionalAttributes =
  | "id"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type nftCreatorFollowCreationAttributes = Optional<
  nftCreatorFollowAttributes,
  nftCreatorFollowOptionalAttributes
>; 