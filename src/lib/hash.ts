import { randomBytes, pbkdf2Sync } from "crypto";

/**
 * Hash d'un PIN utilisateur avec salt unique
 * Format retourné: "ITER:SALT_HEX:HASH_HEX"
 */
export function hashPin(pin: string): string {
  const iterations = 100000;
  const salt = randomBytes(32);
  const hash = pbkdf2Sync(pin, salt, iterations, 64, "sha512");
  
  return `${iterations}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Vérifie si un PIN correspond au hash stocké
 */
export function verifyPin(pin: string, storedHash: string): boolean {
  try {
    const [iterStr, saltHex, hashHex] = storedHash.split(":");
    const iterations = parseInt(iterStr, 10);
    const salt = Buffer.from(saltHex, "hex");
    const storedHashBuffer = Buffer.from(hashHex, "hex");
    
    const hash = pbkdf2Sync(pin, salt, iterations, 64, "sha512");
    
    return hash.equals(storedHashBuffer);
  } catch {
    return false;
  }
}