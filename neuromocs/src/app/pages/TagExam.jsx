import { useEffect, useMemo, useRef, useState } from "react";
import { TERM_BANK } from "../data/terms";
import { BN_SCOPES } from "../data/brainScopes";

const COURSE = {
  BEHAVIORAL_NEURO: "behavioral_neuro",
  PSYCH_NATURAL_WORLD: "psych_natural_world",
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function normalizeAnswer(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "");
}
function isCorrectTyped(term, userInput) {
  const guess = normalizeAnswer(userInput);
  const targets = [term.name, ...(term.aliases || [])].map(normalizeAnswer);
  return targets.includes(guess);
}
function scopeLabelFromKey(key) {
  return BN_SCOPES.find((s) => s.key === key)?.label || key;
}

function reinsertSoon(queue, id) {
  const q = queue.filter((x) => x !== id);
  const offset = randInt(2, 3);
  const idx = Math.min(offset, q.length);
  return [...q.slice(0, idx), id, ...q.slice(idx)];
}

/**
 * Read a mask image and pick a random point inside the highlighted region.
 * Works best if the region is non-transparent and/or has bright pixels.
 * Returns { xPct, yPct } where values are 0..1.
 */

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

// Hue ranges (tuned for "painted on photo" highlights)
function hueInRange(h, a, b) {
  // supports wrap-around (e.g. red around 0)
  if (a <= b) return h >= a && h <= b;
  return h >= a || h <= b;
}

function matchesHighlight(rgb, highlight) {
  const { r, g, b, a } = rgb;
  if (a !== undefined && a < 10) return false;

  const { h, s, v } = rgbToHsv(r, g, b);

  // Must be “marker-like”: fairly saturated + not too dark
  if (s < 0.35) return false;
  if (v < 0.20) return false;

  if (highlight === "red") {
    // red/orange marker often ends up 0–25 or 330–360
    return hueInRange(h, 330, 360) || hueInRange(h, 0, 30);
  }
  if (highlight === "yellow") {
    return hueInRange(h, 35, 75);
  }
  if (highlight === "green") {
    return hueInRange(h, 80, 160);
  }

  // fallback: any saturated pixel
  return s > 0.5 && v > 0.25;
}

/**
 * Use the highlighted "key" image (painted overlay) as the mask.
 * Returns {xPct,yPct} within the highlighted region.
 */
async function pickRandomPointFromKeyImage(keyUrl, highlight) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = keyUrl;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const candidates = [];
  const step = 2; // keep 2; raise to 3–4 if you need speed

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (matchesHighlight({ r, g, b, a }, highlight)) {
        candidates.push([x, y]);
      }
    }
  }

  if (candidates.length === 0) {
    // fallback: center
    return { xPct: 0.5, yPct: 0.5 };
  }

  const [x, y] = candidates[Math.floor(Math.random() * candidates.length)];
  return { xPct: x / width, yPct: y / height };
}

export default function TagExam() {
  const [course, setCourse] = useState(COURSE.BEHAVIORAL_NEURO);
  const [selectedScope, setSelectedScope] = useState(null);

  const [started, setStarted] = useState(false);
  const [pool, setPool] = useState([]); // queue of term ids
  const [stageById, setStageById] = useState({}); // 0 = not mastered, 1 = mastered
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [locked, setLocked] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  // after a miss: force copy-to-continue, but keep it marked wrong
  const [mustCopy, setMustCopy] = useState(false);
  const [lastResult, setLastResult] = useState(null); // "correct" | "wrong" | null

  const [arrowPoint, setArrowPoint] = useState({ xPct: 0.5, yPct: 0.5 });
  const [loadingPoint, setLoadingPoint] = useState(false);

  const availableScopes = useMemo(() => {
    if (course !== COURSE.BEHAVIORAL_NEURO) return [];
    const keys = new Set();
    TERM_BANK.forEach((t) => {
      if (!t.courses?.includes(course)) return;
      (t.scopeKeys || []).forEach((k) => keys.add(k));
    });
    return BN_SCOPES.filter((s) => keys.has(s.key));
  }, [course]);

  const setTerms = useMemo(() => {
    const base = TERM_BANK.filter((t) => t.courses?.includes(course));
    if (course === COURSE.BEHAVIORAL_NEURO) {
      if (!selectedScope) return [];
      return base.filter((t) => (t.scopeKeys || []).includes(selectedScope));
    }
    return base;
  }, [course, selectedScope]);

  const currentTerm = useMemo(() => {
    if (!started || pool.length === 0) return null;
    const id = pool[0];
    return setTerms.find((t) => t.id === id) || null;
  }, [started, pool, setTerms]);

  const baseImage = currentTerm?.imageBase || null;

  const masteredCount = useMemo(() => {
    return setTerms.filter((t) => (stageById[t.id] || 0) >= 1).length;
  }, [setTerms, stageById]);

  function resetRun() {
    setStarted(false);
    setPool([]);
    setStageById({});
    setTyped("");
    setFeedback(null);
    setLocked(false);
    setShowContinue(false);
    setMustCopy(false);
    setLastResult(null);
    setArrowPoint({ xPct: 0.5, yPct: 0.5 });
  }

  function startRun() {
    const init = {};
    setTerms.forEach((t) => (init[t.id] = 0));
    setStageById(init);

    setPool(shuffle(setTerms.map((t) => t.id)));
    setStarted(true);
    setTyped("");
    setFeedback({ type: "ok", msg: "Type the structure the arrow is pointing to." });
    setLocked(false);
    setShowContinue(false);
    setMustCopy(false);
    setLastResult(null);
  }

  async function refreshArrowPoint(term) {
    // We display base; we sample from highlighted key image
    if (!term?.imageKey) {
        setArrowPoint({ xPct: 0.5, yPct: 0.5 });
        return;
    }

    setLoadingPoint(true);
    try {
        const pt = await pickRandomPointFromKeyImage(term.imageKey, term.highlight);
        setArrowPoint(pt);
    } catch (e) {
        setArrowPoint({ xPct: 0.5, yPct: 0.5 });
    } finally {
        setLoadingPoint(false);
    }
    }

  // whenever current term changes, pick a new random arrow location
  useEffect(() => {
    setTyped("");
    setFeedback(null);
    setLocked(false);
    setShowContinue(false);
    setMustCopy(false);
    setLastResult(null);

    if (currentTerm) refreshArrowPoint(currentTerm);
  }, [currentTerm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function goNextCard() {
    setFeedback(null);
    setTyped("");
    setLocked(false);
    setShowContinue(false);
    setMustCopy(false);

    if (pool.length === 0) return;

    const currentId = pool[0];
    const isMastered = (stageById[currentId] || 0) >= 1;

    setPool((prev) => {
      if (prev.length === 0) return prev;
      const id = prev[0];
      const rest = prev.slice(1);

      // mastered -> drop it
      if (isMastered) return rest;

      // wrong -> reinsert soon
      if (lastResult === "wrong") return reinsertSoon(rest, id);

      // correct but not mastered (rare here) -> push back
      return [...rest, id];
    });

    setLastResult(null);
  }

  function markMastered(termId) {
    setStageById((prev) => ({ ...prev, [termId]: 1 }));
  }

  function submitTyped() {
    if (!currentTerm || locked) return;

    const input = typed.trim();
    if (!input) {
      setFeedback({ type: "bad", msg: "Type an answer first." });
      return;
    }

    // If they missed already, force copy-exact to continue,
    // but keep lastResult as wrong so it reinserts soon.
    if (mustCopy) {
      const exact = normalizeAnswer(typed) === normalizeAnswer(currentTerm.name);
      if (exact) {
        setFeedback({ type: "ok", msg: "Good — you’ll see this again soon." });
        setLocked(true);
        setShowContinue(true);
      } else {
        setFeedback({
          type: "bad",
          msg: `Copy exactly to continue: “${currentTerm.name}”`,
        });
        setTyped("");
        setLocked(false);
        setShowContinue(false);
      }
      return;
    }

    const ok = isCorrectTyped(currentTerm, typed);

    if (ok) {
      // correct on first attempt => mastered immediately (tag exam mode)
      setLastResult("correct");
      markMastered(currentTerm.id);

      setFeedback({ type: "ok", msg: "Correct ✅" });
      setLocked(true);
      setShowContinue(true);
    } else {
      // wrong => show answer, force copy to continue, and schedule it soon
      setLastResult("wrong");
      setMustCopy(true);

      setFeedback({
        type: "bad",
        msg: `Incorrect — correct answer: “${currentTerm.name}”. You’ll see this again soon. Type it exactly to continue.`,
      });

      setTyped("");
      setLocked(false);
      setShowContinue(false);
    }
  }

  const canStart =
    setTerms.length > 0 && (course !== COURSE.BEHAVIORAL_NEURO || !!selectedScope);

  return (
    <div className="container">
      <h1 className="pageTitle">Tag Exam Preparation</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        You’ll see an unlabeled brain with an arrow. Type the correct structure name.
        Misses will reappear soon.
      </p>

      {!started && (
        <section className="card" style={{ marginTop: 14 }}>
          <h2 className="sectionTitle">Choose your set</h2>

          <div className="courseToggle" style={{ marginTop: 10 }}>
            <button
              className={`toggleBtn ${course === COURSE.BEHAVIORAL_NEURO ? "active" : ""}`}
              onClick={() => { setCourse(COURSE.BEHAVIORAL_NEURO); setSelectedScope(null); }}
              type="button"
            >
              Behavioral Neuroscience
            </button>
            <button
              className={`toggleBtn ${course === COURSE.PSYCH_NATURAL_WORLD ? "active" : ""}`}
              onClick={() => { setCourse(COURSE.PSYCH_NATURAL_WORLD); setSelectedScope(null); }}
              type="button"
            >
              Psych in the Natural World
            </button>
          </div>

          {course === COURSE.BEHAVIORAL_NEURO && (
            <div style={{ marginTop: 12 }}>
              <div className="muted">Pick a view/dissection set:</div>
              <div className="bnChoices" style={{ marginTop: 10 }}>
                {availableScopes.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`choiceBtn ${selectedScope === s.key ? "active" : ""}`}
                    onClick={() => setSelectedScope(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn primary" type="button" disabled={!canStart} onClick={startRun}>
              Start Tag Exam
            </button>
            <span className="muted">
              {course === COURSE.BEHAVIORAL_NEURO && selectedScope
                ? `Set: ${scopeLabelFromKey(selectedScope)} • ${setTerms.length} terms`
                : `${setTerms.length} terms`}
            </span>
          </div>

          <div className="noteCallout" style={{ marginTop: 14 }}>
            <b>Setup note:</b> Each term needs a <code>mask</code> image and a shared <code>imageBase</code>.
            Masks can be colored (green/red/yellow) — the game just finds the highlighted pixels.
          </div>
        </section>
      )}

      {started && currentTerm && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="gameTopRow">
            <div>
              <div className="muted" style={{ fontSize: 13 }}>
                {course === COURSE.BEHAVIORAL_NEURO && selectedScope
                  ? scopeLabelFromKey(selectedScope)
                  : "Course term set"}
              </div>
              <h2 className="sectionTitle" style={{ marginTop: 4 }}>
                Progress: {masteredCount}/{setTerms.length} mastered
              </h2>
            </div>

            <button className="btn" type="button" onClick={resetRun}>
              Change set
            </button>
          </div>

          {/* Image + arrow */}
          <div className="tagExamBoard" style={{ marginTop: 12 }}>
            {baseImage ? (
                <>
                <img
                    className="tagExamImg"
                    src={baseImage}
                    alt="Unlabeled brain"
                    onError={(e) => {
                    console.error("Base image failed to load:", baseImage);
                    e.currentTarget.style.display = "none";
                    }}
                />

                {/* arrow */}
                <div
                    className="tagArrow"
                    style={{
                    left: `${arrowPoint.xPct * 100}%`,
                    top: `${arrowPoint.yPct * 100}%`,
                    opacity: loadingPoint ? 0.35 : 1,
                    }}
                    aria-hidden="true"
                />

                {/* DEBUG: remove later */}
                <div className="tagDebug">
                    <div><b>base:</b> {baseImage}</div>
                    <div><b>key:</b> {currentTerm?.imageKey || "(none)"}</div>
                    <div><b>highlight:</b> {currentTerm?.highlight || "(none)"}</div>
                </div>
                </>
            ) : (
                <div className="noteCallout">
                <b>No base image found.</b> Make sure your terms include <code>imageBase</code>.
                </div>
            )}
            </div>

          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 8 }}>
              {mustCopy ? "Copy the correct answer exactly to continue:" : "Type the structure name:"}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className="termSearch"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type here…"
                disabled={locked}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !locked) submitTyped();
                }}
                style={{ flex: "1 1 320px" }}
              />
              <button className="btn primary" type="button" onClick={submitTyped} disabled={locked}>
                Check
              </button>
            </div>

            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              Tip: capitalization doesn’t matter. Aliases may be accepted. Misses reappear soon.
            </div>

            {feedback && (
              <div className={`feedback ${feedback.type}`} style={{ marginTop: 12 }}>
                {feedback.msg}
              </div>
            )}

            {showContinue && (
              <button className="btn" type="button" onClick={goNextCard} style={{ marginTop: 10 }}>
                Continue
              </button>
            )}
          </div>
        </section>
      )}

      {started && !currentTerm && (
        <section className="card" style={{ marginTop: 14 }}>
          <h2 className="sectionTitle">All mastered ✅</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            You mastered the full set. Run it again later to keep it automatic.
          </p>
          <button className="btn primary" type="button" onClick={resetRun} style={{ marginTop: 10 }}>
            Pick a new set
          </button>
        </section>
      )}
    </div>
  );
}