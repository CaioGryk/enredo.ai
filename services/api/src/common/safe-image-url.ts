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
