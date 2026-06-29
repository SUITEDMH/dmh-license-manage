import crypto from "crypto";

const LICENSE_PRODUCTS: Record<string, number> = {
  recorder: 0,
  cash_sheeter: 1,
  inventory: 2,
  suite: 3,
};

const LICENSE_TYPES: Record<string, number> = {
  trial: 0,
  subscription: 1,
  perpetual: 2,
};

function generateRandomKey(): string {
  const bytes = crypto.randomBytes(15);
  const hex = bytes.toString("hex").toUpperCase();
  return [
    hex.slice(0, 6),
    hex.slice(6, 12),
    hex.slice(12, 18),
    hex.slice(18, 24),
    hex.slice(24, 30),
  ].join("-");
}

export function generateLicenseKey(
  machineId: string,
  product: string,
  licenseType: string,
  expiresAt: Date | null
): string {
  const productCode = LICENSE_PRODUCTS[product] ?? 0;
  const typeCode = LICENSE_TYPES[licenseType] ?? 0;

  const expiryDays = expiresAt
    ? Math.floor(expiresAt.getTime() / 86400000)
    : 0;

  const machineHash = crypto
    .createHash("sha256")
    .update(machineId)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  const randomPart = generateRandomKey();

  const suffix = `${productCode}${typeCode}${expiryDays.toString(36).toUpperCase().padStart(5, "0")}${machineHash.slice(0, 4)}`;

  return `${randomPart.slice(0, 17)}-${suffix.slice(0, 8).padEnd(8, "X")}`;
}

export function computeExpiryDate(
  licenseType: string,
  durationDays?: number | null
): Date | null {
  if (licenseType === "perpetual") return null;

  const days =
    durationDays ??
    (licenseType === "trial" ? 7 : licenseType === "subscription" ? 30 : 7);

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

export function isLicenseExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

export function daysRemaining(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const diff = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}
