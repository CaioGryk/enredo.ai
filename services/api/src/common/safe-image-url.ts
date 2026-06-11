/**
 * Strip inline/base64 image URLs, keeping only external http(s) URLs.
 *
 * Inline data URIs (data:image/...;base64,...) are valid for rendering
 * but bloat API responses and slow down list endpoints. External beta
 * testers should never receive multi-megabyte inline image payloads.
 *
 * This helper returns null for inline/base64 URLs and returns the
 * original value for external http(s) URLs. Null/undefined inputs
 * are passed through as null.
 */

export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const normalized = url.trim().toLowerCase();
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return url;
  }
  return null;
}

export function isInlineImageDataUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(url.trim());
}

export function parseInlineImageDataUrl(url: string): { contentType: string; buffer: Buffer } | null {
  const match = url.trim().match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}
