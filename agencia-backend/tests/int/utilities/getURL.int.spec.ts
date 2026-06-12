import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Store original env
const ORIGINAL_URL = process.env.NEXT_PUBLIC_SERVER_URL

describe('getServerUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SERVER_URL
    delete process.env.PAYLOAD_PUBLIC_SERVER_URL
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SERVER_URL = ORIGINAL_URL
  })

  it('returns the env var value', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.com'
    const { getServerUrl } = await import('@/utilities/getURL')
    expect(getServerUrl()).toBe('https://example.com')
  })

  it('strips trailing slash', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.com/'
    const { getServerUrl } = await import('@/utilities/getURL')
    expect(getServerUrl()).toBe('https://example.com')
  })

  it('falls back to default when env var is not set', async () => {
    const { getServerUrl } = await import('@/utilities/getURL')
    expect(getServerUrl()).toBe('http://localhost:3000')
  })
})
