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
function StoryCard({ item, accentColor, index, topicLabel }) {
  const [aiData, setAiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
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

  return (
    <article style={{
      borderBottom: `1px solid ${C.faint}`,
      padding: '24px 0',
    }}>

      {/* Meta row */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        marginBottom: 11, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          letterSpacing: 1.5, color: accentColor,
          textTransform: 'uppercase', fontWeight: 500,
        }}>{topicLabel}</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.faint }}>·</span>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: C.dimmer, letterSpacing: 0.5,
        }}>{item.source}</span>
        <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.faint }}>·</span>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: C.dimmer,
        }}>{timeAgo(item.pubDate)}</span>
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
          borderLeft: expanded ? `3px solid ${accentColor}` : '3px solid transparent',
          paddingLeft: expanded ? 13 : 0,
          transition: 'padding-left 0.2s, border-color 0.2s',
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
        <div>
          {item.description && (
            <p style={{
              fontSize: 'clamp(14px, 2.2vw, 16px)',
              fontFamily: "'Lora', serif",
              color: C.ink,
              lineHeight: 1.88,
              marginBottom: 18,
              borderLeft: `2px solid ${accentColor}`,
              paddingLeft: 13,
              margin: 0,
              marginBottom: 18,
            }}>{item.description}</p>
          )}

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 10, fontFamily: "'DM Mono', monospace",
                letterSpacing: 1.2, color: accentColor,
                textDecoration: 'none',
                borderBottom: `1px solid ${accentColor}`,
                paddingBottom: 1,
              }}>READ FULL STORY ↗</a>

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

// ─── Topic section ─────────────────────────────────────────────────────────
function TopicSection({ topicKey, topic }) {
  const { items, loading, error, refresh } = useTopic(topicKey, topic.feeds)
  const [expanded, setExpanded] = useState(true)

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${topic.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2,
            textTransform: 'uppercase', color: C.black, fontWeight: 500,
          }}>{topic.label}</div>
          {!loading && (
            <div style={{
              fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.dimmer,
            }}>{items.length} stories</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={refresh} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.dimmer,
            letterSpacing: 1, padding: 0,
          }}>↻ REFRESH</button>
          <button onClick={() => setExpanded(e => !e)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, fontFamily: "'DM Mono', monospace", color: C.dimmer,
            letterSpacing: 1, padding: 0,
          }}>{expanded ? 'COLLAPSE' : 'EXPAND'}</button>
        </div>
      </div>

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

      {expanded && items.map((item, i) => (
        <StoryCard
          key={item.id}
          item={item}
          accentColor={topic.color}
          index={i}
          topicLabel={topic.label}
        />
      ))}
    </section>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeFilter, setActiveFilter] = useState('all')
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  const topics = Object.entries(TOPICS)
  const visibleTopics = activeFilter === 'all'
    ? topics
    : topics.filter(([key]) => key === activeFilter)

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>

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
            <div style={{
              fontSize: 10, fontFamily: "'DM Mono', monospace",
              color: C.dimmer, letterSpacing: 0.5,
              textAlign: 'right', paddingBottom: 3,
            }}>{dateStr}</div>
          </div>

          {/* Filter tabs */}
          <div style={{
            display: 'flex', overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '9px 14px 8px', border: 'none', background: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: activeFilter === 'all' ? C.black : C.dimmer,
                borderBottom: activeFilter === 'all' ? `2px solid ${C.black}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}>All</button>
            {topics.map(([key, topic]) => (
              <button key={key}
                onClick={() => setActiveFilter(key)}
                style={{
                  padding: '9px 14px 8px', border: 'none', background: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: activeFilter === key ? topic.color : C.dimmer,
                  borderBottom: activeFilter === key ? `2px solid ${topic.color}` : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>{topic.label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '8px 20px 80px' }}>
        {visibleTopics.map(([key, topic]) => (
          <TopicSection key={key} topicKey={key} topic={topic} />
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