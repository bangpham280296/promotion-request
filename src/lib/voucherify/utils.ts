// src/lib/voucherify/utils.ts

/**
 * Normalizes and formats thumbnail URL for Voucherify.
 * - Extracts Google Drive File ID from share links and converts to an API proxy image URL.
 * - Trims whitespace.
 * - Returns undefined if empty string or invalid URL to prevent metadata validation failures.
 */
export function formatThumbnailUrl(url?: string | null, appUrl?: string): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Extract Google Drive File ID from common share / view link patterns:
  // 1. https://drive.google.com/file/d/FILE_ID/view...
  // 2. https://drive.google.com/open?id=FILE_ID
  // 3. https://drive.google.com/uc?id=FILE_ID
  // 4. https://lh3.googleusercontent.com/d/FILE_ID
  const driveMatch =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);

  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    // If we have an appUrl (from backend request), use our proxy API route
    // This gives us a 100% valid URL with `.png` in the actual path that passes any strict regex validation.
    if (appUrl) {
      return `${appUrl}/api/images/proxy/${fileId}.png`;
    }
    // Fallback if no appUrl provided (e.g. if called purely client-side without origin)
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}
