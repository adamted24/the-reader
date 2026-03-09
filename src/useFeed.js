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
    // Load from localStorage on first render
    try {
      const stored = localStorage.getItem(cacheKey)
      if (stored) {
        const { data, ts } = JSON.parse(stored)
        if (Date.now() - ts < CACHE_TTL) {
          // Restore dates which get serialized as strings
          return data.map(item => ({ ...item, pubDate: new Date(item.pubDate) }))
        }
      }
    } catch {}
    return []
  })

  const [loading, setLoading] = useState(items.length === 0)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    // Skip fetch if cache is fresh and this isn't a manual refresh
    if (refreshTrigger === 0) {
      try {
        const stored = localStorage.getItem(cacheKey)
        if (stored) {
          const { ts } = JSON.parse(stored)
          if (Date.now() - ts < CACHE_TTL) return
        }
      } catch {}
    }

    setLoading(true)
    try {
      const results = await Promise.allSettled(feeds.map(fetchFeed))
      const all = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      setItems(all)
      // Persist to localStorage
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: all, ts: Date.now() }))
      } catch {}
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [topicKey, refreshTrigger])

  useEffect(() => { load() }, [load])

  return { items, loading, error }
}