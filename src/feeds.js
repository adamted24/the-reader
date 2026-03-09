// ─── Feed sources by topic ─────────────────────────────────────────────────
export const TOPICS = {
  la: {
    label: "Los Angeles",
    color: "#C8943A",
    feeds: [
      { name: "LA Times", url: "https://www.latimes.com/rss2.0.xml" },
      { name: "LAist", url: "https://laist.com/index.rss" },
      { name: "LA Taco", url: "https://www.lataco.com/feed/" },
      { name: "LA Magazine", url: "https://www.lamag.com/feed/" },
      { name: "Knock LA", url: "https://knock.la/feed/" },
      { name: "Streetsblog LA", url: "https://la.streetsblog.org/feed/" },
      { name: "The Eastsider", url: "https://www.theeastsiderla.com/feed/" },
      { name: "Jewish Journal", url: "https://jewishjournal.com/feed/" },
    ]
  },
  jewish: {
    label: "Jewish World",
    color: "#09A1A1",
    feeds: [
      { name: "JTA", url: "https://www.jta.org/feed" },
      { name: "Forward", url: "https://forward.com/feed/" },
      { name: "eJewishPhilanthropy", url: "https://ejewishphilanthropy.com/feed/" },
      { name: "Jewish Insider", url: "https://jewishinsider.com/feed/" },
      { name: "Tablet Magazine", url: "https://www.tabletmag.com/rss" },
      { name: "Jewish Review of Books", url: "https://jewishreviewofbooks.com/feed/" },
      { name: "Jewish Currents", url: "https://jewishcurrents.org/feed/" },
    ]
  },
  literary: {
    label: "Literary & Long-form",
    color: "#D396A6",
    feeds: [
      { name: "The Paris Review", url: "https://www.theparisreview.org/feed" },
      { name: "Literary Hub", url: "https://lithub.com/feed/" },
      { name: "The Millions", url: "https://themillions.com/feed" },
      { name: "LARB", url: "https://lareviewofbooks.org/feed/" },
      { name: "The Believer", url: "https://thebeliever.net/feed/" },
      { name: "Longreads", url: "https://longreads.com/feed/" },
      { name: "n+1", url: "https://nplusonemag.com/feed/" },
      { name: "Public Books", url: "https://www.publicbooks.org/feed/" },
    ]
  }
}

export const PROXY = (url) =>
  `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`