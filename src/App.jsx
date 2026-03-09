import { useState, useEffect, useRef, useCallback } from 'react'
import { TOPICS } from './feeds.js'
import { useTopic } from './useFeed.js'

// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  bg: '#F8F6F1',
  black: '#0f0f0e',
  ink: '#1e1e1b',
  dim: '#4a4a45',
  dimmer: '#6b6b65',
  faint: '#e2dfd8',
  soft: '#eeeae2',
  teal: '#09A1A1',
  rose: '#D396A6',
  gold: '#C8943A',
  white: '#ffffff',
}

// ─── Relative time ─────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = Date.now() - date
  if (diff <= 0) return 'just now'
  const h = Math.floor(diff / 36e5)
  const m = Math.floor(diff / 6e4)
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── AI summary cache ──────────────────────────────────────────────────────
const summaryCache = {}

async function getSummary(item) {
  const key = item.id
  if (summaryCache[key]) return summaryCache[key]
  if (!item.description || item.description.length < 30) {
    summaryCache[key] = null
    return null
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You write crisp one-sentence summaries and extract a short direct quote for a news reader.
Respond in this exact JSON format:
{
  "summary": "One sentence, under 25 words, no 'This article...' framing. Just the essence.",
  "quote": "A direct quote from the text, under 15 words, in regular straight quotes.",
  "attribution": "Speaker or author name if known, otherwise omit"
}`,
        messages: [{ role: 'user', content: `Headline: ${item.title}\n\nText: ${item.description}` }]
      })
    })
    const data = await res.json()
    const text = data.content?.[0]?.text?.trim()
    if (!text) return null
    const parsed = JSON.parse(text)
    summaryCache[key] = parsed
    return parsed
  } catch {
    return null
  }
}

// ─── Story card ────────────────────────────────────────────────────────────
function StoryCard({ item, accentColor, index, topicLabel, saved, onSave }) {
  const [aiData, setAiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasTriedRef = useRef(false)

  useEffect(() => {
    if (hasTriedRef.current) return
    hasTriedRef.current = true
    const delay = index * 400
    const t = setTimeout(async () => {
      setLoading(true)
      const result = await getSummary(item)
      setAiData(result)
      setLoading(false)
    }, delay)
    return () => clearTimeout(t)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(item.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article style={{ borderBottom: `1px solid ${C.faint}`, padding: '22px 0' }}>

      {/* Meta row: source · topic · age · bookmark */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        marginBottom: 11, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: C.dimmer, letterSpacing: 0.5, fontWeight: 500,
        }}>{item.source}</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.faint }}>·</span>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          letterSpacing: 1.5, color: accentColor,
          textTransform: 'uppercase', fontWeight: 500,
        }}>{topicLabel}</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.faint }}>·</span>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: C.dimmer,
        }}>{timeAgo(item.pubDate)}</span>
        <button
  onClick={() => onSave(item)}
  style={{
    fontSize: 10, fontFamily: "'DM Mono', monospace",
    letterSpacing: 1.2, color: saved ? accentColor : C.dimmer,
    background: 'none', border: 'none',
    cursor: 'pointer', padding: 0,
  }}
>{saved ? '🔖 SAVED' : '🔖 SAVE'}</button>
      </div>

      {/* Headline */}
      <h2
        onClick={() => setExpanded(e => !e)}
        style={{
          fontSize: 'clamp(19px, 3.5vw, 24px)',
          fontFamily: "'Lora', serif",
          fontWeight: 600,
          color: C.black,
          lineHeight: 1.28,
          marginBottom: 11,
          cursor: 'pointer',
          margin: 0,
          marginBottom: 11,
        }}
      >{item.title}</h2>

      {/* AI Summary */}
      {loading && (
        <div style={{
          fontSize: 11, fontFamily: "'DM Mono', monospace",
          color: C.dimmer, letterSpacing: 0.5, marginBottom: 11,
        }}>summarizing…</div>
      )}

      {aiData?.summary && !loading && (
        <p style={{
          fontSize: 'clamp(15px, 2.4vw, 17px)',
          fontFamily: "'Lora', serif",
          fontStyle: 'italic',
          color: C.ink,
          lineHeight: 1.72,
          margin: 0,
          marginBottom: 11,
        }}>{aiData.summary}</p>
      )}

      {/* Quote block */}
      {aiData?.quote && !loading && (
        <div style={{
          borderLeft: `2px solid ${C.faint}`,
          paddingLeft: 13,
          marginBottom: 13,
        }}>
          <p style={{
            fontSize: 'clamp(14px, 2.2vw, 16px)',
            fontFamily: "'Lora', serif",
            fontStyle: 'italic',
            color: C.dim,
            lineHeight: 1.72,
            margin: 0,
            marginBottom: 4,
          }}>"{aiData.quote}"</p>
          {aiData.attribution && (
            <span style={{
              fontSize: 10,
              fontFamily: "'DM Mono', monospace",
              color: C.dimmer,
              letterSpacing: 0.3,
            }}>— {aiData.attribution}, via {item.source}</span>
          )}
        </div>
      )}

      {/* Expand / collapse */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            letterSpacing: 1.2, color: accentColor,
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
          }}
        >READ MORE +</button>
      ) : (
        <div style={{
          border: `1px solid ${C.faint}`,
          borderRadius: 3,
          padding: '16px',
          marginTop: 4,
        }}>
          {/* Body text */}
          {item.description && (
            <p style={{
              fontSize: 'clamp(14px, 2.2vw, 16px)',
              fontFamily: "'Lora', serif",
              color: C.ink,
              lineHeight: 1.88,
              margin: 0,
              marginBottom: 14,
            }}>{item.description}</p>
          )}

          {/* Action row */}
          <div style={{
            display: 'flex', gap: 16, alignItems: 'center',
            flexWrap: 'wrap', paddingTop: 10,
            borderTop: `1px solid ${C.faint}`,
          }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 10, fontFamily: "'DM Mono', monospace",
                letterSpacing: 1.2, color: accentColor,
                textDecoration: 'none',
                borderBottom: `1px solid ${accentColor}`,
                paddingBottom: 1,
              }}>READ FULL STORY ↗</a>

            <button
              onClick={() => onSave(item)}
              style={{
                fontSize: 10, fontFamily: "'DM Mono', monospace",
                letterSpacing: 1.2, color: saved ? accentColor : C.dimmer,
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >{saved ? '🔖 SAVED' : '🔖 SAVE'}</button>

            <button
              onClick={() => setExpanded(false)}
              style={{
                fontSize: 10, fontFamily: "'DM Mono', monospace",
                letterSpacing: 1.2, color: C.dimmer,
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, marginLeft: 'auto',
              }}
            >COLLAPSE −</button>
          </div>
        </div>
      )}
    </article>
  )
}

// ─── Saved card (in SAVED view) ────────────────────────────────────────────
function SavedCard({ item, accentColor, topicLabel, onUnsave }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(item.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article style={{
      borderBottom: `1px solid ${C.faint}`,
      padding: '22px 0',
    }}>
      {/* Meta */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        marginBottom: 11, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: C.dimmer, letterSpacing: 0.5, fontWeight: 500,
        }}>{item.source}</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.faint }}>·</span>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          letterSpacing: 1.5, color: accentColor,
          textTransform: 'uppercase', fontWeight: 500,
        }}>{topicLabel}</span>
        <button
          onClick={() => onUnsave(item.id)}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontSize: 14,
          }}
          title="Remove from saved"
        >🔖</button>
      </div>

      {/* Headline */}
      <h2 style={{
        fontSize: 'clamp(19px, 3.5vw, 24px)',
        fontFamily: "'Lora', serif",
        fontWeight: 600, color: C.black,
        lineHeight: 1.28, margin: 0, marginBottom: 14,
      }}>{item.title}</h2>

      {/* URL box */}
      <div style={{
        border: `1px solid ${C.faint}`,
        borderRadius: 3,
        padding: '12px 14px',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: C.dimmer, letterSpacing: 1, marginBottom: 6,
        }}>LINK</div>
        <div style={{
          fontSize: 11, fontFamily: "'DM Mono', monospace",
          color: C.dim, wordBreak: 'break-all', lineHeight: 1.6,
          userSelect: 'all',
        }}>{item.link}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleCopy}
          style={{
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            letterSpacing: 1.2, color: copied ? C.teal : accentColor,
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
            transition: 'color 0.2s',
          }}
        >{copied ? '✓ COPIED' : 'COPY LINK'}</button>

        <a href={item.link} target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            letterSpacing: 1.2, color: C.dimmer,
            textDecoration: 'none',
            borderBottom: `1px solid ${C.faint}`,
            paddingBottom: 1,
          }}>READ FULL STORY ↗</a>

        <button
          onClick={() => onUnsave(item.id)}
          style={{
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            letterSpacing: 1.2, color: C.dimmer,
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, marginLeft: 'auto',
          }}
        >REMOVE −</button>
      </div>
    </article>
  )
}

// ─── Topic section ─────────────────────────────────────────────────────────
function TopicSection({ topicKey, topic, savedIds, onSave, refreshTrigger }) {
  const { items, loading, error } = useTopic(topicKey, topic.feeds, refreshTrigger)

  return (
    <section style={{ marginBottom: 48 }}>
      {loading && (
        <div style={{
          fontSize: 11, fontFamily: "'DM Mono', monospace", color: C.dimmer,
          letterSpacing: 1.5, padding: '24px 0',
        }}>LOADING…</div>
      )}
      {error && (
        <div style={{
          fontSize: 13, fontFamily: "'Lora', serif", fontStyle: 'italic',
          color: C.dimmer, padding: '12px 0',
        }}>Some feeds unavailable.</div>
      )}
      {items.map((item, i) => (
        <StoryCard
          key={item.id}
          item={item}
          accentColor={topic.color}
          index={i}
          topicLabel={topic.label}
          saved={savedIds.has(item.id)}
          onSave={onSave}
        />
      ))}
    </section>
  )
}

// ─── Pull to refresh ───────────────────────────────────────────────────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(null)
  const [pulling, setPulling] = useState(false)
  const [distance, setDistance] = useState(0)
  const threshold = 80

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
      }
    }
    const onTouchMove = (e) => {
      if (startY.current === null) return
      const dist = e.touches[0].clientY - startY.current
      if (dist > 0) {
        setPulling(true)
        setDistance(Math.min(dist, threshold * 1.5))
      }
    }
    const onTouchEnd = () => {
      if (distance >= threshold) {
        onRefresh()
      }
      startY.current = null
      setPulling(false)
      setDistance(0)
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [distance, onRefresh])

  return { pulling, distance, threshold }
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [savedItems, setSavedItems] = useState(() => {
    try {
      const stored = localStorage.getItem('reader-saved')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const savedIds = new Set(savedItems.map(i => i.id))

  // Persist saved items
  useEffect(() => {
    try {
      localStorage.setItem('reader-saved', JSON.stringify(savedItems))
    } catch {}
  }, [savedItems])

  const handleSave = useCallback((item) => {
    setSavedItems(prev => {
      const exists = prev.find(i => i.id === item.id)
      if (exists) return prev.filter(i => i.id !== item.id)
      return [...prev, item]
    })
  }, [])

  const handleUnsave = useCallback((id) => {
    setSavedItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleRefreshAll = useCallback(() => {
    setRefreshTrigger(t => t + 1)
  }, [])

  const { pulling, distance, threshold } = usePullToRefresh(handleRefreshAll)

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  const topics = Object.entries(TOPICS)

  // Find topic color for a saved item
  const getTopicForItem = (item) => {
    for (const [key, topic] of topics) {
      if (topic.feeds.some(f => f.name === item.source)) {
        return { key, topic }
      }
    }
    return { key: 'la', topic: topics[0][1] }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>

      {/* Pull to refresh indicator */}
      {pulling && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: Math.min(distance, 60),
          background: C.bg,
          transition: 'height 0.1s',
        }}>
          <div style={{
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            color: distance >= threshold ? C.teal : C.dimmer,
            letterSpacing: 1,
          }}>
            {distance >= threshold ? '↑ RELEASE TO REFRESH' : '↓ PULL TO REFRESH'}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${C.faint}`,
        padding: '0 20px',
        position: 'sticky', top: 0, zIndex: 10,
        background: C.bg,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', paddingTop: 18, paddingBottom: 14,
          }}>
            <div style={{
              fontSize: 'clamp(26px, 5vw, 36px)',
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              color: C.black, lineHeight: 1,
            }}>
              The <span style={{ fontStyle: 'italic', color: C.teal }}>Reader</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={handleRefreshAll}
                style={{
                  fontSize: 10, fontFamily: "'DM Mono', monospace",
                  letterSpacing: 1, color: C.dimmer,
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0,
                }}
              >↻ REFRESH</button>
              <div style={{
                fontSize: 10, fontFamily: "'DM Mono', monospace",
                color: C.dimmer, letterSpacing: 0.5,
                textAlign: 'right',
              }}>{dateStr}</div>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{
            display: 'flex', overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            {[
              { key: 'all', label: 'All', color: C.black },
              ...topics.map(([key, topic]) => ({ key, label: topic.label, color: topic.color })),
              { key: 'saved', label: `Saved${savedItems.length > 0 ? ` (${savedItems.length})` : ''}`, color: C.dimmer },
            ].map(({ key, label, color }) => (
              <button key={key}
                onClick={() => setActiveFilter(key)}
                style={{
                  padding: '9px 14px 8px', border: 'none', background: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: activeFilter === key ? color : C.dimmer,
                  borderBottom: activeFilter === key ? `2px solid ${color}` : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '8px 20px 80px' }}>

        {/* Saved view */}
        {activeFilter === 'saved' && (
          <section style={{ marginBottom: 48 }}>
            {savedItems.length === 0 ? (
              <div style={{
                padding: '48px 0', textAlign: 'center',
                fontFamily: "'Lora', serif", fontStyle: 'italic',
                color: C.dimmer, fontSize: 17,
              }}>No saved stories yet. Tap 🔖 on any story to save it.</div>
            ) : (
              savedItems.map(item => {
                const { topic } = getTopicForItem(item)
                return (
                  <SavedCard
                    key={item.id}
                    item={item}
                    accentColor={topic.color}
                    topicLabel={topic.label}
                    onUnsave={handleUnsave}
                  />
                )
              })
            )}
          </section>
        )}

        {/* Topic sections */}
        {activeFilter !== 'saved' && topics
          .filter(([key]) => activeFilter === 'all' || activeFilter === key)
          .map(([key, topic]) => (
            <TopicSection
              key={key}
              topicKey={key}
              topic={topic}
              savedIds={savedIds}
              onSave={handleSave}
              refreshTrigger={refreshTrigger}
            />
          ))}
      </main>

      <footer style={{
        borderTop: `1px solid ${C.faint}`, padding: '16px 20px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: C.dimmer, letterSpacing: 1,
        }}>THE READER · PERSONAL EDITION</div>
      </footer>
    </div>
  )
}