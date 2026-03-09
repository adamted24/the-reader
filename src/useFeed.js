import { useState, useEffect, useCallback } from 'react'

const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

const PROXY = (url) =>
  `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`

async function fetchFeed(feed) {
  try {
    const res = await fetch(PROXY(feed.url), { signal: AbortSignal.timeout(20000) })
    const json = await res.json()
    if (json.status !== 'ok') return []
    return json.items.slice(0, 8).map(item => ({
      id: item.link || item.title,
      title: item.title,
      link: item.link,
      source: feed.name,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      description: item.description
        ? item.description.replace(/<[^>]+>/g, '').slice(0, 280)
        : item.content?.replace(/<[^>]+>/g, '').slice(0, 280) || '',
    }))
  } catch (e) {
    console.warn(`Failed to fetch ${feed.name}:`, e.message)
    return []
  }
}

export function useTopic(topicKey, feeds, refreshTrigger = 0) {
  const cacheKey = `reader-feed-${topicKey}`

  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(cacheKey)
      if (stored) {
        const { data, ts } = JSON.parse(stored)
        if (Date.now() - ts < CACHE_TTL) {
          return data.map(item => ({ ...item, pubDate: new Date(item.pubDate) }))
        }
      }
    } catch {}
    return []
  })

  const [loading, setLoading] = useState(items.length === 0)
  const [error, setError] = useState(null)

  useEffect(() => {
    // On first load, skip fetch if cache is fresh
    if (refreshTrigger === 0) {
      try {
        const stored = localStorage.getItem(cacheKey)
        if (stored) {
          const { ts } = JSON.parse(stored)
          if (Date.now() - ts < CACHE_TTL) {
            setLoading(false)
            return
          }
        }
      } catch {}
    }

    // Always fetch on manual refresh (refreshTrigger > 0) or stale/missing cache
    let cancelled = false
    setLoading(true)

    Promise.allSettled(feeds.map(fetchFeed)).then(results => {
      if (cancelled) return
      const all = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      setItems(all)
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: all, ts: Date.now() }))
      } catch {}
      setLoading(false)
    }).catch(e => {
      if (cancelled) return
      setError(e.message)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [topicKey, refreshTrigger])

  return { items, loading, error }
}
```

Save with **Cmd + S**, then:
```
git add .
git commit -m "fix pull to refresh stall"
git push