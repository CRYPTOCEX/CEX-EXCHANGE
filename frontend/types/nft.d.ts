// NFT Category Types
interface NftCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
  collectionsCount?: number;
}

// NFT Collection Types
interface NftCollection {
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
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
  };
  category?: NftCategory;
  stats?: {
    floorPrice?: number;
    totalVolume?: number;
    owners?: number;
    listed?: number;
  };
}

// NFT Token Types
interface NftToken {
  id: string;
  collectionId: string;
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: NftAttribute[];
  metadataUri?: string;
  metadataHash?: string;
  ownerId?: string;
  creatorId: string;
  mintedAt?: string;
  isMinted: boolean;
  isListed: boolean;
  views?: number;
  likes?: number;
  rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  rarityScore?: number;
  status: "DRAFT" | "MINTED" | "BURNED";
  createdAt?: string;
  updatedAt?: string;
  collection?: NftCollection;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  currentListing?: NftListing;
  lastSale?: NftSale;
  isFavorited?: boolean;
}

interface NftAttribute {
  trait_type: string;
  value: string | number;
  display_type?: "boost_number" | "boost_percentage" | "number" | "date";
  max_value?: number;
}

// NFT Listing Types
interface NftListing {
  id: string;
  tokenId: string;
  sellerId: string;
  type: "FIXED_PRICE" | "AUCTION" | "BUNDLE";
  price?: number;
  currency: string;
  reservePrice?: number;
  buyNowPrice?: number;
  startTime?: string;
  endTime?: string;
  status: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
  views?: number;
  likes?: number;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  token?: NftToken;
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  highestBid?: NftBid;
  timeLeft?: number;
}

// NFT Bid Types
interface NftBid {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  currency: string;
  expiresAt?: string;
  status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  listing?: NftListing;
  bidder?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// NFT Offer Types
interface NftOffer {
  id: string;
  tokenId?: string;
  collectionId?: string;
  listingId?: string;
  offererId: string;
  amount: number;
  currency: string;
  expiresAt?: string;
  status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  token?: NftToken;
  collection?: NftCollection;
  listing?: NftListing;
  offerer?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// NFT Sale Types
interface NftSale {
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
  createdAt?: string;
  updatedAt?: string;
  token?: NftToken;
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  buyer?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// NFT Activity Types
interface NftActivity {
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
  createdAt?: string;
  token?: NftToken;
  collection?: NftCollection;
  fromUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  toUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// NFT Favorite Types
interface NftFavorite {
  id: string;
  userId: string;
  tokenId?: string;
  collectionId?: string;
  createdAt?: string;
  token?: NftToken;
  collection?: NftCollection;
}

// Form Data Types
interface CreateCollectionFormData {
  name: string;
  symbol: string;
  description?: string;
  chain: string;
  network?: string;
  standard?: "ERC721" | "ERC1155";
  maxSupply?: number;
  mintPrice?: number;
  currency?: string;
  royaltyPercentage?: number;
  royaltyAddress?: string;
  categoryId?: string;
  bannerImage?: string;
  logoImage?: string;
  featuredImage?: string;
  website?: string;
  discord?: string;
  twitter?: string;
  telegram?: string;
  isLazyMinted?: boolean;
  metadata?: any;
}

interface CreateTokenFormData {
  collectionId: string;
  name: string;
  description?: string;
  image?: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: NftAttribute[];
}

interface CreateListingFormData {
  tokenId: string;
  type: "FIXED_PRICE" | "AUCTION" | "BUNDLE";
  price?: number;
  currency: string;
  reservePrice?: number;
  buyNowPrice?: number;
  startTime?: string;
  endTime?: string;
}

interface CreateBidFormData {
  listingId: string;
  amount: number;
  currency?: string;
  expiresAt?: string;
}

interface CreateOfferFormData {
  tokenId?: string;
  collectionId?: string;
  amount: number;
  currency?: string;
  expiresAt?: string;
}

// Filter Types
interface NftCollectionFilters {
  status?: "DRAFT" | "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  chain?: string;
  categoryId?: string;
  creatorId?: string;
  isVerified?: boolean;
  search?: string;
  sortField?: "createdAt" | "name" | "totalSupply" | "floorPrice" | "totalVolume";
  sortOrder?: "asc" | "desc";
}

interface NftTokenFilters {
  collectionId?: string;
  ownerId?: string;
  creatorId?: string;
  isListed?: boolean;
  rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  status?: "DRAFT" | "MINTED" | "BURNED";
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  search?: string;
  attributes?: Record<string, string[]>;
  sortField?: "createdAt" | "name" | "price" | "rarity" | "views";
  sortOrder?: "asc" | "desc";
}

interface NftListingFilters {
  type?: "FIXED_PRICE" | "AUCTION" | "BUNDLE";
  status?: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
  sellerId?: string;
  collectionId?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  endingSoon?: boolean;
  sortField?: "createdAt" | "price" | "endTime" | "views";
  sortOrder?: "asc" | "desc";
}

// API Response Types
interface NftApiResponse<T> {
  data: T;
  message?: string;
}

interface NftPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

// Store Types
interface NftMarketplaceState {
  // Collections
  collections: NftCollection[];
  collection: NftCollection | null;
  collectionsLoading: boolean;
  
  // Tokens
  tokens: NftToken[];
  token: NftToken | null;
  tokensLoading: boolean;
  
  // Listings
  listings: NftListing[];
  listing: NftListing | null;
  listingsLoading: boolean;
  
  // Categories
  categories: NftCategory[];
  categoriesLoading: boolean;
  
  // Activity
  activities: NftActivity[];
  activitiesLoading: boolean;
  
  // User data
  userCollections: NftCollection[];
  userTokens: NftToken[];
  userListings: NftListing[];
  userBids: NftBid[];
  userOffers: NftOffer[];
  userFavorites: NftFavorite[];
  
  // Filters
  collectionFilters: NftCollectionFilters;
  tokenFilters: NftTokenFilters;
  listingFilters: NftListingFilters;
  
  // UI State
  selectedChain: string;
  selectedCategory: string | null;
  viewMode: "grid" | "list";
  
  // Error handling
  error: string | null;
}

// Analytics Types
interface NftAnalytics {
  totalCollections: number;
  totalTokens: number;
  totalListings: number;
  totalSales: number;
  totalVolume: number;
  averagePrice: number;
  floorPrice: number;
  topCollections: NftCollection[];
  recentSales: NftSale[];
  priceHistory: Array<{
    date: string;
    volume: number;
    sales: number;
    averagePrice: number;
  }>;
}

// Blockchain Types
interface SupportedChain {
  id: string;
  name: string;
  chain: string;
  network: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  status: boolean;
}

// Smart Contract Types
interface NftContract {
  address: string;
  abi: any[];
  type: "ERC721" | "ERC1155";
  chain: string;
  network: string;
}

// IPFS Types
interface IpfsMetadata {
  name: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  attributes?: NftAttribute[];
}

// Wallet Integration Types
interface WalletConnection {
  address: string;
  chain: string;
  network: string;
  balance: string;
  isConnected: boolean;
}

// Minting Types
interface MintingProgress {
  step: "upload" | "metadata" | "contract" | "mint" | "complete";
  progress: number;
  message: string;
  transactionHash?: string;
  tokenId?: string;
}

export type {
  NftCategory,
  NftCollection,
  NftToken,
  NftAttribute,
  NftListing,
  NftBid,
  NftOffer,
  NftSale,
  NftActivity,
  NftFavorite,
  CreateCollectionFormData,
  CreateTokenFormData,
  CreateListingFormData,
  CreateBidFormData,
  CreateOfferFormData,
  NftCollectionFilters,
  NftTokenFilters,
  NftListingFilters,
  NftApiResponse,
  NftPaginatedResponse,
  NftMarketplaceState,
  NftAnalytics,
  SupportedChain,
  NftContract,
  IpfsMetadata,
  WalletConnection,
  MintingProgress,
}; 