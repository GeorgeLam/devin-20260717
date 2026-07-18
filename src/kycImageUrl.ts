// Applicant-supplied document image URLs are untrusted: they originate from the
// applicant's submission and must never be fetched by a reviewer's browser
// unless they point at a known, trusted document store. Rendering them directly
// as `<img src>` would leak the reviewer's IP / User-Agent / Referer, enable
// tracking of when a case is reviewed, and allow arbitrary content injection.
//
// Only https URLs whose origin is on this allowlist are considered safe to
// render. Extend this list (ideally from configuration) when a real internal
// document store is introduced.
export const TRUSTED_DOCUMENT_IMAGE_ORIGINS: readonly string[] = ['https://placehold.co']

// Returns the original URL when it is safe to render as an `<img src>`, or null
// when it is missing, malformed, non-https, or served from an origin that is
// not on the trusted allowlist.
export function safeDocumentImageUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null
  if (!TRUSTED_DOCUMENT_IMAGE_ORIGINS.includes(parsed.origin)) return null

  return parsed.href
}
