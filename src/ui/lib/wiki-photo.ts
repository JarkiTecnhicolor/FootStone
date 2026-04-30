const cache = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

const STORAGE_KEY = 'footstone:wiki-photos:v1'

function loadCache(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, string | null>
    for (const [key, value] of Object.entries(parsed)) cache.set(key, value)
  } catch {
    /* ignore */
  }
}

function persistCache(): void {
  try {
    const obj: Record<string, string | null> = {}
    for (const [key, value] of cache.entries()) obj[key] = value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
    /* ignore */
  }
}

let initialized = false
function ensureInit(): void {
  if (initialized) return
  initialized = true
  loadCache()
}

export function getCachedWikiPhoto(title: string): string | null | undefined {
  ensureInit()
  return cache.get(title)
}

export function fetchWikiPhoto(title: string): Promise<string | null> {
  ensureInit()
  if (cache.has(title)) return Promise.resolve(cache.get(title)!)
  const existing = inflight.get(title)
  if (existing) return existing

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const promise = fetch(url, { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null))
    .then((j: { thumbnail?: { source?: string } } | null) => j?.thumbnail?.source ?? null)
    .catch(() => null)
    .then(result => {
      cache.set(title, result)
      inflight.delete(title)
      persistCache()
      return result
    })

  inflight.set(title, promise)
  return promise
}
