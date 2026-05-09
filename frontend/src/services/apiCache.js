/**
 * Simple in-memory API cache with TTL.
 * Caches GET responses to reduce redundant API calls.
 */
const cache = new Map()

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

// Endpoints that change rarely → cache longer
const LONG_CACHE_PATTERNS = [
  '/boarding-houses',
  '/service-types',
  '/service-catalog',
]

function getTTL(url) {
  if (LONG_CACHE_PATTERNS.some(p => url.includes(p))) {
    return 10 * 60 * 1000 // 10 minutes
  }
  return DEFAULT_TTL
}

export function getCached(url) {
  const entry = cache.get(url)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    cache.delete(url)
    return null
  }
  return entry.data
}

export function setCache(url, data) {
  cache.set(url, {
    data,
    expiry: Date.now() + getTTL(url),
  })
}

export function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

export function clearAllCache() {
  cache.clear()
}
