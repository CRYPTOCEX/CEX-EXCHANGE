import { useConfigStore } from "@/store/config";

/**
 * Utility to check if extensions are available
 */
export class ExtensionChecker {
  private static instance: ExtensionChecker;
  private availableExtensions: Set<string> = new Set();
  private initialized = false;

  private constructor() {}

  public static getInstance(): ExtensionChecker {
    if (!ExtensionChecker.instance) {
      ExtensionChecker.instance = new ExtensionChecker();
    }
    return ExtensionChecker.instance;
  }

  /**
   * Initialize the extension checker with available extensions
   */
  public initialize(extensions: string[]): void {
    this.availableExtensions = new Set(extensions);
    this.initialized = true;
  }

  /**
   * Check if an extension is available
   */
  public isExtensionAvailable(extensionName: string): boolean {
    if (!this.initialized) {
      // If not initialized, try to get extensions from config store
      const configStore = useConfigStore.getState();
      if (configStore.extensions && configStore.extensions.length > 0) {
        this.initialize(configStore.extensions);
      } else {
        // If no extensions available, return false
        return false;
      }
    }
    
    return this.availableExtensions.has(extensionName);
  }

  /**
   * Check if multiple extensions are available
   */
  public areExtensionsAvailable(extensionNames: string[]): boolean {
    return extensionNames.every(name => this.isExtensionAvailable(name));
  }

  /**
   * Get all available extensions
   */
  public getAvailableExtensions(): string[] {
    if (!this.initialized) {
      const configStore = useConfigStore.getState();
      if (configStore.extensions && configStore.extensions.length > 0) {
        this.initialize(configStore.extensions);
      }
    }
    return Array.from(this.availableExtensions);
  }

  /**
   * Update available extensions (useful when extensions are dynamically loaded)
   */
  public updateExtensions(extensions: string[]): void {
    this.initialize(extensions);
  }
}

/**
 * Convenience function to check if an extension is available
 */
export function isExtensionAvailable(extensionName: string): boolean {
  return ExtensionChecker.getInstance().isExtensionAvailable(extensionName);
}

/**
 * Convenience function to check if multiple extensions are available
 */
export function areExtensionsAvailable(extensionNames: string[]): boolean {
  return ExtensionChecker.getInstance().areExtensionsAvailable(extensionNames);
}

/**
 * Hook to check extension availability in React components
 */
export function useExtensionChecker() {
  const { extensions } = useConfigStore();
  
  // Initialize extension checker with current extensions
  const checker = ExtensionChecker.getInstance();
  if (extensions && extensions.length > 0) {
    checker.initialize(extensions);
  }

  return {
    isExtensionAvailable: (extensionName: string) => checker.isExtensionAvailable(extensionName),
    areExtensionsAvailable: (extensionNames: string[]) => checker.areExtensionsAvailable(extensionNames),
    getAvailableExtensions: () => checker.getAvailableExtensions(),
    // Re-export extensions for dependency tracking
    extensions,
  };
} 