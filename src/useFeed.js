import { useState, useEffect, useCallback } from 'react'
import { parseFeed } from './parseFeed.js'

const CACHE_TTL = 1000 * 60 * 30
const cache = {}

const PROXY = (url) =>
  `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`

async function fetchFeed(feed) {
  const cacheKey = feed.url
  const now = Date.now()
  if (cache[cacheKey] && now - cache[cacheKey].ts < CACHE_TTL) {
    return cache[cacheKey].items
  }
  try {
    const res = await fetch(PROXY(feed.url), { signal: AbortSignal.timeout(20000) })
    const json = await res.json()
    if (json.status !== 'ok') return []
    const items = json.items.slice(0, 8).map(item => ({
      id: item.link || item.title,
      title: item.title,
      link: item.link,
      source: feed.name,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      description: item.description
        ? item.description.replace(/<[^>]+>/g, '').slice(0, 280)
        : item.content?.replace(/<[^>]+>/g, '').slice(0, 280) || '',
    }))
    cache[cacheKey] = { items, ts: now }
    return items
  } catch (e) {
    console.warn(`Failed to fetch ${feed.name}:`, e.message)
    return []
  }
}

export function useTopic(topicKey, feeds) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled(feeds.map(fetchFeed))
      const all = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => b.pubDate - a.pubDate)
      setItems(all)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [topicKey])

  useEffect(() => { load() }, [load])

  return { items, loading, error, refresh: load }
}