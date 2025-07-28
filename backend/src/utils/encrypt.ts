import crypto from "crypto";

let dynamicEncryptionKey: Buffer | null = null;
const encryptedKey = process.env.ENCRYPTED_ENCRYPTION_KEY;
const passphrase = process.env.ENCRYPTION_KEY_PASSPHRASE;
if (encryptedKey && passphrase) {
  setEncryptionKey(passphrase);
}

function decryptEncryptionKey(
  encryptedKey: string,
  passphrase: string
): string {
  if (!encryptedKey || !passphrase) {
    throw new Error("Encrypted key or passphrase is missing");
  }

  try {
    const [iv, authTag, cipherText, salt] = encryptedKey
      .split(":")
      .map((part) => Buffer.from(part, "hex"));

    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha512");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    // Update the decipher with the cipherText. No inputEncoding is needed as cipherText is a Buffer.
    // Specify 'utf8' as the outputEncoding to get a string result directly.
    let decrypted = decipher.update(cipherText, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}

export async function setEncryptionKey(passphrase: string) {
  if (!passphrase) {
    throw new Error("Passphrase is required to set encryption key");
  }

  if (!encryptedKey) {
    throw new Error("Encrypted key is required to set encryption key");
  }

  try {
    const decryptedKey = decryptEncryptionKey(encryptedKey, passphrase);
    setDynamicEncryptionKey(decryptedKey);

    return true;
  } catch (error) {
    console.error("Failed to set the encryption key:", error);
    return false;
  }
}

export function setDynamicEncryptionKey(key: string) {
  if (!key) {
    throw new Error("Encryption key is required");
  }

  dynamicEncryptionKey = Buffer.from(key, "hex");
}

export function encrypt(text: string): string {
  if (!dynamicEncryptionKey) {
    throw new Error("Encryption key is not set");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dynamicEncryptionKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (!dynamicEncryptionKey) {
    console.error("Encryption key is not set");
    throw new Error("Encryption key is not set");
  }

  const [ivHex, authTagHex, encryptedText] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    dynamicEncryptionKey,
    iv
  );
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function isUnlockedEcosystemVault(): boolean {
  return !!dynamicEncryptionKey;
}
