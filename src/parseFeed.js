// ─── RSS parser (browser-side, no deps) ───────────────────────────────────

export function parseFeed(xmlString, sourceName) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    // Support both RSS and Atom formats
    const isAtom = doc.querySelector('feed') !== null
    const items = isAtom
      ? [...doc.querySelectorAll('entry')]
      : [...doc.querySelectorAll('item')]

    return items.slice(0, 8).map(item => {
      const get = (tag) => item.querySelector(tag)?.textContent?.trim() || ''
      const getAttr = (tag, attr) => item.querySelector(tag)?.getAttribute(attr) || ''

      const title = get('title').replace(/<!\[CDATA\[|\]\]>/g, '')
      const link = isAtom
        ? getAttr('link[rel="alternate"]', 'href') || getAttr('link', 'href')
        : get('link') || getAttr('link', 'href')
      const pubDate = get('pubDate') || get('published') || get('updated') || ''
      const description = (get('description') || get('summary') || get('content'))
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .slice(0, 280)

      return {
        id: link || title,
        title,
        link,
        source: sourceName,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        description,
      }
    }).filter(item => item.title && item.link)
  } catch (e) {
    console.warn('Feed parse error:', e)
    return []
  }
}