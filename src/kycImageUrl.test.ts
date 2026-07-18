import { describe, it, expect } from 'vitest'
import { safeDocumentImageUrl } from './kycImageUrl'

describe('safeDocumentImageUrl', () => {
  it('allows https URLs from a trusted origin', () => {
    const url = 'https://placehold.co/320x200/e2e8f0/64748b?text=Passport'
    expect(safeDocumentImageUrl(url)).toBe(url)
  })

  it('rejects untrusted origins', () => {
    expect(safeDocumentImageUrl('https://evil.example.com/track.png')).toBeNull()
  })

  it('rejects non-https schemes', () => {
    expect(safeDocumentImageUrl('http://placehold.co/320x200.png')).toBeNull()
    expect(safeDocumentImageUrl('javascript:alert(1)')).toBeNull()
    expect(safeDocumentImageUrl('data:image/png;base64,AAAA')).toBeNull()
  })

  it('rejects missing or malformed URLs', () => {
    expect(safeDocumentImageUrl(undefined)).toBeNull()
    expect(safeDocumentImageUrl('')).toBeNull()
    expect(safeDocumentImageUrl('not a url')).toBeNull()
  })

  it('rejects lookalike origins', () => {
    expect(safeDocumentImageUrl('https://placehold.co.evil.com/x.png')).toBeNull()
  })
})
