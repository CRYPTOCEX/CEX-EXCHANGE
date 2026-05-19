// Offline Transaction Manager
// This utility handles storing and syncing transactions when offline

// Interface for offline transactions
interface OfflineTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  walletType: string;
  timestamp: number;
  status: string;
  metadata: Record<string, any>;
}

// Database name and store
const DB_NAME = "offlineTransactions";
const STORE_NAME = "pendingTransactions";
const DB_VERSION = 1;

// Check if IndexedDB is available
function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

// Open the IndexedDB database
async function openDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    console.warn("IndexedDB is not available in this browser");
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Error opening IndexedDB:", request.error);
        resolve(null); // Resolve with null instead of rejecting
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
    } catch (error) {
      console.error("Exception when opening IndexedDB:", error);
      resolve(null);
    }
  });
}

// Fallback to localStorage if IndexedDB is not available
function getLocalStorageFallback(): OfflineTransaction[] {
  try {
    const data = localStorage.getItem("offlineTransactions");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
}

function saveLocalStorageFallback(transactions: OfflineTransaction[]): void {
  try {
    localStorage.setItem("offlineTransactions", JSON.stringify(transactions));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

// Save a transaction to be processed when online
export async function saveOfflineTransaction(
  transaction: OfflineTransaction
): Promise<void> {
  try {
    // Add timestamp if not present
    if (!transaction.timestamp) {
      transaction.timestamp = Date.now();
    }

    // Mark as pending
    transaction.status = "pending";

    // Try IndexedDB first
    const db = await openDatabase();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        // Store the transaction
        await new Promise<void>((resolve, reject) => {
          const request = store.add(transaction);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });

        // Close the database
        db.close();
      } catch (error) {
        console.error(
          "Error using IndexedDB, falling back to localStorage:",
          error
        );
        // Fallback to localStorage
        const transactions = getLocalStorageFallback();
        transactions.push(transaction);
        saveLocalStorageFallback(transactions);
      }
    } else {
      // Fallback to localStorage
      const transactions = getLocalStorageFallback();
      transactions.push(transaction);
      saveLocalStorageFallback(transactions);
    }

    console.log("Transaction saved for offline processing:", transaction.id);
  } catch (error) {
    console.error("Error saving offline transaction:", error);
    // Last resort fallback - try localStorage directly
    try {
      const transactions = getLocalStorageFallback();
      transactions.push(transaction);
      saveLocalStorageFallback(transactions);
    } catch (secondError) {
      console.error("Final fallback also failed:", secondError);
    }
  }
}

// Get all pending transactions
export async function getPendingTransactions(): Promise<OfflineTransaction[]> {
  try {
    // Try IndexedDB first
    const db = await openDatabase();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);

        const transactions = await new Promise<OfflineTransaction[]>(
          (resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          }
        );

        // Close the database
        db.close();

        return transactions;
      } catch (error) {
        console.error(
          "Error using IndexedDB, falling back to localStorage:",
          error
        );
        // Fallback to localStorage
        return getLocalStorageFallback();
      }
    } else {
      // Fallback to localStorage
      return getLocalStorageFallback();
    }
  } catch (error) {
    console.error("Error getting pending transactions:", error);
    // Last resort fallback
    return getLocalStorageFallback();
  }
}

// Remove a transaction from the pending queue
export async function removePendingTransaction(id: string): Promise<void> {
  try {
    // Try IndexedDB first
    const db = await openDatabase();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        await new Promise<void>((resolve, reject) => {
          const request = store.delete(id);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });

        // Close the database
        db.close();
      } catch (error) {
        console.error(
          "Error using IndexedDB, falling back to localStorage:",
          error
        );
        // Fallback to localStorage
        const transactions = getLocalStorageFallback();
        const filteredTransactions = transactions.filter((tx) => tx.id !== id);
        saveLocalStorageFallback(filteredTransactions);
      }
    } else {
      // Fallback to localStorage
      const transactions = getLocalStorageFallback();
      const filteredTransactions = transactions.filter((tx) => tx.id !== id);
      saveLocalStorageFallback(filteredTransactions);
    }
  } catch (error) {
    console.error("Error removing pending transaction:", error);
    // Last resort fallback
    try {
      const transactions = getLocalStorageFallback();
      const filteredTransactions = transactions.filter((tx) => tx.id !== id);
      saveLocalStorageFallback(filteredTransactions);
    } catch (secondError) {
      console.error("Final fallback also failed:", secondError);
    }
  }
}

// Modify the syncOfflineTransactions function to handle syncing without service worker
export async function syncOfflineTransactions(): Promise<void> {
  try {
    // Get all pending transactions
    const pendingTransactions = await getPendingTransactions();

    if (pendingTransactions.length === 0) {
      console.log("No pending transactions to sync");
      return;
    }

    console.log(`Syncing ${pendingTransactions.length} pending transactions`);

    // Process each pending transaction
    for (const tx of pendingTransactions) {
      try {
        // Send the transaction to the server
        const response = await fetch("/api/finance/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tx),
        });

        if (response.ok) {
          // If successful, remove from storage
          await removePendingTransaction(tx.id);
          console.log(`Transaction ${tx.id} synced successfully`);
        } else {
          console.error(
            `Failed to sync transaction ${tx.id}:`,
            await response.text()
          );
        }
      } catch (error) {
        console.error(`Error syncing transaction ${tx.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in syncOfflineTransactions:", error);
  }
}

// Check if the device is online
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// Add a listener for online events
export function addOnlineListener(callback: () => void): void {
  if (typeof window !== "undefined") {
    window.addEventListener("online", callback);
  }
}

// Add a listener for offline events
export function addOfflineListener(callback: () => void): void {
  if (typeof window !== "undefined") {
    window.removeEventListener("offline", callback);
  }
}

// Remove a listener for online events
export function removeOnlineListener(callback: () => void): void {
  if (typeof window !== "undefined") {
    window.removeEventListener("online", callback);
  }
}

// Remove a listener for offline events
export function removeOfflineListener(callback: () => void): void {
  if (typeof window !== "undefined") {
    window.removeEventListener("offline", callback);
  }
}
