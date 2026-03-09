import { useState, useEffect } from 'react'

const CACHE_TTL = 1000 * 60 * 30 // 30 min
const cache = {}

async function fetchFeed(feed, bustCache = false) {
  const cacheKey = feed.url
  const now = Date.now()
  if (!bustCache && cache[cacheKey] && now - cache[cacheKey].ts < CACHE_TTL) {
    return cache[cacheKey].items
  }
  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=10`
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
    const json = await res.json()
    if (json.status !== 'ok') return []
    const items = json.items.map(item => ({
      id: item.link || item.title,
      title: item.title || '',
      link: item.link || '',
      source: feed.name,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      description: (item.description || item.content || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
        .slice(0, 400),
    })).filter(i => i.title && i.link)
    cache[cacheKey] = { items, ts: now }
    return items
  } catch (e) {
    console.warn(`Failed to fetch ${feed.name}:`, e.message)
    return []
  }
}

export function useTopic(topicKey, feeds, refreshTrigger = 0) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const bustCache = refreshTrigger > 0

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.allSettled(feeds.map(f => fetchFeed(f, bustCache)))
        if (cancelled) return
        const all = results
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value)
          .sort((a, b) => b.pubDate - a.pubDate)
        setItems(all)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [topicKey, refreshTrigger])

  return { items, loading, error }
}