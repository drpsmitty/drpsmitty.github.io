const VIDEOS = [
  {
    title: "Pyschology In the Natural World: Sheep Brian Overview",
    description: "Walk through what you need to label and understand on the sheep brain.",
    // Option A: Drive share link (opens Drive page)
    link: "https://drive.google.com/file/d/1OWz64EHWBELma1d0D9_VdDqIXJDF335y/view?usp=sharing",
    embed: "https://drive.google.com/file/d/1OWz64EHWBELma1d0D9_VdDqIXJDF335y/preview",
  },
  // add more...
];

export default function Videos() {
  return (
    <div className="container">
      <header className="pageHeader">
        <h1 className="pageTitle">Videos</h1>
        <p className="pageSubtitle muted">
          Lab and study videos for Neuromocs. If an embed doesn’t load, use the “Open in Drive” link.
        </p>
      </header>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="videoGrid">
          {VIDEOS.map((v) => (
            <article className="videoCard" key={v.title}>
              <div className="videoTop">
                <h3 style={{ margin: 0 }}>{v.title}</h3>
                <a className="btn" href={v.link} target="_blank" rel="noreferrer">
                  Open in Drive
                </a>
              </div>

              {v.description ? <p className="muted" style={{ marginTop: 6 }}>{v.description}</p> : null}

              {/* EMBED (optional) */}
              {v.embed ? (
                <div className="videoFrameWrap" style={{ marginTop: 10 }}>
                  <iframe
                    className="videoFrame"
                    src={v.embed}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title={v.title}
                  />
                </div>
              ) : (
                <div className="noteCallout" style={{ marginTop: 10 }}>
                  Embed not enabled for this video. Use “Open in Drive.”
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}