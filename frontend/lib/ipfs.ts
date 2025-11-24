// IPFS Integration Service for NFT Marketplace
// Provides decentralized storage for NFT metadata and images

interface IPFSUploadResult {
  success: boolean;
  hash?: string;
  url?: string;
  error?: string;
}

interface IPFSMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
}

class IPFSService {
  private static instance: IPFSService;
  private readonly PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  private readonly PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
  private readonly IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

  private constructor() {}

  public static getInstance(): IPFSService {
    if (!IPFSService.instance) {
      IPFSService.instance = new IPFSService();
    }
    return IPFSService.instance;
  }

  /**
   * Upload file to IPFS via Pinata
   */
  public async uploadFile(file: File, options?: { 
    name?: string; 
    keyValues?: Record<string, string> 
  }): Promise<IPFSUploadResult> {
    try {
      if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
        return {
          success: false,
          error: "IPFS credentials not configured"
        };
      }

      const formData = new FormData();
      formData.append("file", file);

      if (options?.name || options?.keyValues) {
        const metadata = JSON.stringify({
          name: options.name || file.name,
          ...(options.keyValues && { keyvalues: options.keyValues })
        });
        formData.append("pinataMetadata", metadata);
      }

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          "pinata_api_key": this.PINATA_API_KEY,
          "pinata_secret_api_key": this.PINATA_SECRET_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        hash: result.IpfsHash,
        url: `${this.IPFS_GATEWAY}${result.IpfsHash}`,
      };
    } catch (error) {
      console.error("IPFS file upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed"
      };
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  public async uploadMetadata(metadata: IPFSMetadata, options?: {
    name?: string;
    keyValues?: Record<string, string>;
  }): Promise<IPFSUploadResult> {
    try {
      if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
        return {
          success: false,
          error: "IPFS credentials not configured"
        };
      }

      const pinataMetadata = {
        name: options?.name || `${metadata.name} Metadata`,
        ...(options?.keyValues && { keyvalues: options.keyValues })
      };

      const data = {
        pinataContent: metadata,
        pinataMetadata,
      };

      const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "pinata_api_key": this.PINATA_API_KEY,
          "pinata_secret_api_key": this.PINATA_SECRET_KEY,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`IPFS metadata upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        hash: result.IpfsHash,
        url: `${this.IPFS_GATEWAY}${result.IpfsHash}`,
      };
    } catch (error) {
      console.error("IPFS metadata upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Metadata upload failed"
      };
    }
  }

  /**
   * Upload complete NFT (image + metadata) to IPFS
   */
  public async uploadNFT(
    imageFile: File, 
    metadata: Omit<IPFSMetadata, 'image'>,
    options?: {
      imageKeyValues?: Record<string, string>;
      metadataKeyValues?: Record<string, string>;
    }
  ): Promise<{ 
    success: boolean; 
    imageHash?: string; 
    metadataHash?: string; 
    metadataUrl?: string;
    error?: string; 
  }> {
    try {
      // First upload the image
      const imageResult = await this.uploadFile(imageFile, {
        name: `${metadata.name} Image`,
        keyValues: options?.imageKeyValues
      });

      if (!imageResult.success) {
        return {
          success: false,
          error: `Image upload failed: ${imageResult.error}`
        };
      }

      // Create complete metadata with IPFS image URL
      const completeMetadata: IPFSMetadata = {
        ...metadata,
        image: imageResult.url!
      };

      // Upload metadata
      const metadataResult = await this.uploadMetadata(completeMetadata, {
        name: `${metadata.name} Metadata`,
        keyValues: options?.metadataKeyValues
      });

      if (!metadataResult.success) {
        return {
          success: false,
          error: `Metadata upload failed: ${metadataResult.error}`
        };
      }

      return {
        success: true,
        imageHash: imageResult.hash,
        metadataHash: metadataResult.hash,
        metadataUrl: metadataResult.url
      };
    } catch (error) {
      console.error("Complete NFT upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "NFT upload failed"
      };
    }
  }

  /**
   * Fetch metadata from IPFS
   */
  public async fetchMetadata(hash: string): Promise<IPFSMetadata | null> {
    try {
      const url = `${this.IPFS_GATEWAY}${hash}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("IPFS metadata fetch error:", error);
      return null;
    }
  }

  /**
   * Validate IPFS hash format
   */
  public isValidIPFSHash(hash: string): boolean {
    // Basic IPFS hash validation (CIDv0 and CIDv1)
    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidV1Regex = /^b[a-z2-7]{58}$/;
    
    return cidV0Regex.test(hash) || cidV1Regex.test(hash);
  }

  /**
   * Convert IPFS hash to gateway URL
   */
  public getIPFSUrl(hash: string): string {
    if (!this.isValidIPFSHash(hash)) {
      throw new Error("Invalid IPFS hash");
    }
    return `${this.IPFS_GATEWAY}${hash}`;
  }

  /**
   * Extract IPFS hash from URL
   */
  public extractHashFromUrl(url: string): string | null {
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Pin existing content by hash
   */
  public async pinByHash(hash: string, name?: string): Promise<IPFSUploadResult> {
    try {
      if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
        return {
          success: false,
          error: "IPFS credentials not configured"
        };
      }

      const data = {
        hashToPin: hash,
        ...(name && { pinataMetadata: { name } })
      };

      const response = await fetch("https://api.pinata.cloud/pinning/pinByHash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "pinata_api_key": this.PINATA_API_KEY,
          "pinata_secret_api_key": this.PINATA_SECRET_KEY,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`IPFS pin failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        hash: result.ipfsHash,
        url: `${this.IPFS_GATEWAY}${result.ipfsHash}`,
      };
    } catch (error) {
      console.error("IPFS pin error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Pin failed"
      };
    }
  }

  /**
   * Unpin content from IPFS
   */
  public async unpin(hash: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
        return {
          success: false,
          error: "IPFS credentials not configured"
        };
      }

      const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${hash}`, {
        method: "DELETE",
        headers: {
          "pinata_api_key": this.PINATA_API_KEY,
          "pinata_secret_api_key": this.PINATA_SECRET_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`IPFS unpin failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error("IPFS unpin error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unpin failed"
      };
    }
  }

  /**
   * Get pinned content list
   */
  public async getPinnedContent(options?: {
    status?: 'pinned' | 'unpinned';
    pageLimit?: number;
    pageOffset?: number;
  }): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
        return {
          success: false,
          error: "IPFS credentials not configured"
        };
      }

      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.pageLimit) params.append('pageLimit', options.pageLimit.toString());
      if (options?.pageOffset) params.append('pageOffset', options.pageOffset.toString());

      const response = await fetch(`https://api.pinata.cloud/data/pinList?${params}`, {
        headers: {
          "pinata_api_key": this.PINATA_API_KEY,
          "pinata_secret_api_key": this.PINATA_SECRET_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pinned content: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error("IPFS pinned content fetch error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Fetch failed"
      };
    }
  }
}

// Export singleton instance and types
export const ipfsService = IPFSService.getInstance();
export type { IPFSMetadata, IPFSUploadResult }; 