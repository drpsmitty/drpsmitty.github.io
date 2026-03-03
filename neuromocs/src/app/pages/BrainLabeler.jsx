import { useEffect, useMemo, useRef, useState } from "react";
import { TERM_BANK } from "../data/terms";

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // remove parentheses
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(term, input) {
  const q = normalize(input);
  if (!q) return false;
  if (normalize(term.name) === q) return true;
  return (term.aliases || []).some((a) => normalize(a) === q);
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hueInRange(h, a, b) {
  if (a <= b) return h >= a && h <= b;
  return h >= a || h <= b;
}

function pixelMatchesHighlight(r, g, b, a, highlight) {
  if (a < 10) return false;
  const { h, s, v } = rgbToHsv(r, g, b);

  // "marker-like" filter
  if (s < 0.30) return false;
  if (v < 0.18) return false;

  if (highlight === "red") return hueInRange(h, 330, 360) || hueInRange(h, 0, 35);
  if (highlight === "yellow") return hueInRange(h, 35, 85);
  if (highlight === "green") return hueInRange(h, 80, 170);

  return false;
}

export default function BrainLabeler() {
  // For now: hardcode ventral scope. Later, pass scope in via route or picker.
  const scopeKey = "bn:whole:ventral";

  const terms = useMemo(() => {
    return TERM_BANK
      .filter((t) => (t.scopeKeys || []).includes(scopeKey))
      .filter((t) => t.imageBase && t.imageKey);
  }, [scopeKey]);

  const baseImage = terms[0]?.imageBase || "";

  const imgRef = useRef(null);

  // Offscreen canvases for each key image
  const keyCanvasesRef = useRef(new Map()); // id -> { canvas, ctx, w, h, term }

  const [mode, setMode] = useState("study"); // "study" | "test"
  const [activeTermId, setActiveTermId] = useState(null);
  const [lockedTermId, setLockedTermId] = useState(null);

  const [answer, setAnswer] = useState("");
  const [responses, setResponses] = useState({}); // termId -> { input, correct }

  const [overlayOpacity, setOverlayOpacity] = useState(0.45);

  const activeTerm = terms.find((t) => t.id === (mode === "test" ? lockedTermId : activeTermId)) || null;

  // Load key images into offscreen canvases
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const map = new Map();

      for (const term of terms) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = term.imageKey;

        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error(`Failed to load ${term.imageKey}`));
        });

        if (cancelled) return;

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        map.set(term.id, {
          term,
          canvas,
          ctx,
          w: canvas.width,
          h: canvas.height,
          imageKey: term.imageKey,
        });
      }

      keyCanvasesRef.current = map;
    }

    if (terms.length) loadAll().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [terms]);

  function getImagePixelFromEvent(e) {
    const img = imgRef.current;
    if (!img) return null;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert displayed coords -> natural image coords
    const nx = Math.round((x / rect.width) * img.naturalWidth);
    const ny = Math.round((y / rect.height) * img.naturalHeight);

    if (nx < 0 || ny < 0 || nx >= img.naturalWidth || ny >= img.naturalHeight) return null;
    return { nx, ny };
  }

  function matchScoreAt(ctx, x, y, highlight) {
    const d = ctx.getImageData(x, y, 1, 1).data;
    const r = d[0], g = d[1], b = d[2], a = d[3];
    if (a < 10) return 0;

    // reuse your existing pixelMatchesHighlight, but return a score:
    // score higher when saturation/value are strong
    const { h, s, v } = rgbToHsv(r, g, b);

    // marker-like filters
    if (s < 0.30 || v < 0.18) return 0;

    let ok = false;
    if (highlight === "red") ok = hueInRange(h, 330, 360) || hueInRange(h, 0, 35);
    if (highlight === "yellow") ok = hueInRange(h, 35, 85);
    if (highlight === "green") ok = hueInRange(h, 80, 170);

    if (!ok) return 0;

    // score: stronger saturation/value = stronger match
    return (s * 0.7 + v * 0.3);
  }

function findBestTermAtPixel(nx, ny) {
  const map = keyCanvasesRef.current;
    if (!map || map.size === 0) return null;

    // Look in a small neighborhood so one noisy pixel doesn't dominate
    const offsets = [
      [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
      [2, 0], [-2, 0], [0, 2], [0, -2],
    ];

    let best = { id: null, score: 0 };

    for (const { term, ctx, w, h } of map.values()) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

      let score = 0;
      for (const [dx, dy] of offsets) {
        const x = nx + dx;
        const y = ny + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        score += matchScoreAt(ctx, x, y, term.highlight);
      }

      if (score > best.score) best = { id: term.id, score };
    }

    // Require some minimum confidence
    return best.score > 0.8 ? best.id : null;
  }
  function onMove(e) {
    if (mode === "test" && lockedTermId) return; // keep selection locked in test mode

    const pt = getImagePixelFromEvent(e);
    if (!pt) return;

    const hit = findBestTermAtPixel(pt.nx, pt.ny);
    setActiveTermId(hit);
  }

  function onLeave() {
    if (mode === "test" && lockedTermId) return;
    setActiveTermId(null);
  }

  function onClick(e) {
    if (mode !== "test") return;

    const pt = getImagePixelFromEvent(e);
    if (!pt) return;

    const hit = findBestTermAtPixel(pt.nx, pt.ny);
    if (!hit) return;

    setLockedTermId(hit);
    setAnswer(responses[hit]?.input || "");
  }

  function submitAnswer() {
    if (!lockedTermId) return;
    const term = terms.find((t) => t.id === lockedTermId);
    if (!term) return;

    const ok = matches(term, answer);

    setResponses((prev) => ({
      ...prev,
      [lockedTermId]: { input: answer, correct: ok },
    }));
  }

  function grade() {
    const total = terms.length;
    const correct = terms.reduce((acc, t) => acc + (responses[t.id]?.correct ? 1 : 0), 0);
    return { total, correct };
  }

  const { total, correct } = grade();
  const allAnswered = terms.every((t) => responses[t.id]?.input?.trim());

  return (
    <div className="container">
      <header className="pageHeader">
        <h1 className="pageTitle">Brain Labeler</h1>
        <p className="pageSubtitle muted">
          Study mode: hover to reveal. Test mode: click a region, type the name, then grade when finished.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <button
            className={`btn ${mode === "study" ? "primary" : ""}`}
            type="button"
            onClick={() => { setMode("study"); setLockedTermId(null); }}
          >
            Study (Hover Reveal)
          </button>

          <button
            className={`btn ${mode === "test" ? "primary" : ""}`}
            type="button"
            onClick={() => { setMode("test"); setLockedTermId(null); }}
          >
            Test Mode (Click → Label)
          </button>

          <label className="checkboxRow" style={{ gap: 8 }}>
            <span className="muted">Overlay</span>
            <input
              type="range"
              min="0.15"
              max="0.85"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </header>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
          Set: <b>Whole • Ventral</b>
          {mode === "test" ? (
            <span style={{ marginLeft: 12 }}>
              Score: <b>{correct}/{total}</b> {allAnswered ? "(ready to grade)" : "(in progress)"}
            </span>
          ) : null}
        </div>

        <div
          className="labelerBoard"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onClick={onClick}
        >
          <img
            ref={imgRef}
            className="labelerImg"
            src={baseImage}
            alt="Unlabeled brain"
            draggable={false}
          />

          {/* overlay highlight: show the selected key image */}
          {activeTerm?.imageKey && mode === "study" ? (
            <img
              className="labelerOverlay"
              src={activeTerm.imageKey}
              alt=""
              aria-hidden="true"
              style={{ opacity: overlayOpacity }}
              draggable={false}
            />
          ) : null}

          {activeTerm && mode === "study" ? (
            <div className="labelerTooltip">
              <b>{activeTerm.name}</b>
              <div className="muted" style={{ fontSize: 12 }}>
                {activeTerm.categoryLabel || activeTerm.highlight}
              </div>
            </div>
          ) : null}

          {activeTerm?.imageKey && mode === "test" && lockedTermId ? (
            <img
              className="labelerOverlay"
              src={activeTerm.imageKey}
              alt=""
              aria-hidden="true"
              style={{ opacity: overlayOpacity }}
              draggable={false}
            />
          ) : null}
        </div>

        {mode === "test" && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: "1 1 320px" }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  {lockedTermId ? (
                    <>Selected region: <b>{terms.find(t => t.id === lockedTermId)?.name}</b> (hidden to student later if you want)</>
                  ) : (
                    <>Click a highlighted region to select it.</>
                  )}
                </div>

                <input
                  className="termSearch"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type the structure name…"
                  disabled={!lockedTermId}
                />
              </div>

              <button className="btn primary" type="button" onClick={submitAnswer} disabled={!lockedTermId}>
                Submit
              </button>

              <button
                className="btn"
                type="button"
                onClick={() => { setLockedTermId(null); setAnswer(""); }}
                disabled={!lockedTermId}
              >
                Clear selection
              </button>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  if (!allAnswered) return;
                  alert(`Score: ${correct}/${total}`);
                }}
                disabled={!allAnswered}
              >
                Grade
              </button>

              <button
                className="btn"
                type="button"
                onClick={() => { setResponses({}); setLockedTermId(null); setAnswer(""); }}
              >
                Reset test
              </button>
            </div>

            {/* quick results list */}
            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Responses</div>
              <div className="termGrid">
                {terms.map((t) => {
                  const r = responses[t.id];
                  const status = r?.correct ? "ok" : r?.input ? "bad" : "neutral";
                  return (
                    <div key={t.id} className="termCard">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <b>{t.name}</b>
                        <span className={`resultPill ${status}`}>
                          {status === "ok" ? "Correct" : status === "bad" ? "Wrong" : "—"}
                        </span>
                      </div>
                      <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                        Your answer: {r?.input ? <b>{r.input}</b> : <i>not answered</i>}
                      </div>
                      {status === "bad" ? (
                        <div className="muted" style={{ fontSize: 13 }}>
                          Correct: <b>{t.name}</b>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}