import { useMemo, useState, useRef, useEffect } from "react";
import { TERM_BANK } from "../data/terms";
import { BN_SCOPES } from "../data/brainScopes";



const COURSE = {
  BEHAVIORAL_NEURO: "behavioral_neuro",
  PSYCH_NATURAL_WORLD: "psych_natural_world",
};

// --- helpers ---
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

function reinsertSoon(queue, id) {
  // remove any existing occurrences (avoid duplicates)
  const q = queue.filter((x) => x !== id);

  // insert 2–3 cards later (or at end if queue is short)
  const offset = randInt(2, 3);
  const idx = Math.min(offset, q.length); // if q has <2 cards, append

  return [...q.slice(0, idx), id, ...q.slice(idx)];
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

/**
 * Term training stages:
 * 0 = MCQ
 * 1 = Type #1
 * 2 = Type #2
 * 3 = mastered
 */
function nextStage(stage) {
  return Math.min(3, stage + 1);
}

export default function Flashcards() {
  const [lastResult, setLastResult] = useState(null); // "correct" | "wrong" | null
  const [mustCopy, setMustCopy] = useState(false);          // after a miss, force copy-to-continue
  const [missedThisCard, setMissedThisCard] = useState(false); // marks that this appearance was wrong
  
  const inputRef = useRef(null);
  const [locked, setLocked] = useState(false);       // prevents double submit
  const [showContinue, setShowContinue] = useState(false);
  const [course, setCourse] = useState(COURSE.BEHAVIORAL_NEURO);

  // Set selection mirrors your scope design
  const [selectedScope, setSelectedScope] = useState(null);

  // Run state
  const [started, setStarted] = useState(false);
  const [pool, setPool] = useState([]); // ordered term ids for current session
  const [currentIdx, setCurrentIdx] = useState(0);

  // progress maps: termId -> stage (0..3)
  const [stageById, setStageById] = useState({});
  // strikes for “3 correct” is represented by completing stages 0,1,2 in order.

  // UI for current card
  const [mcqChoice, setMcqChoice] = useState(null);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState(null); // {type:"ok"|"bad", msg:string}

  // Build available sets based on course
  const availableScopes = useMemo(() => {
    if (course !== COURSE.BEHAVIORAL_NEURO) return [];
    // only show scopes that actually have terms
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

    // Psych in Natural World: (for now) use all terms for that course
    return base;
  }, [course, selectedScope]);

  const masteredCount = useMemo(() => {
    return setTerms.filter((t) => (stageById[t.id] || 0) >= 3).length;
  }, [setTerms, stageById]);

  const totalCount = setTerms.length;

  const currentTerm = useMemo(() => {
    if (!started || pool.length === 0) return null;
    const id = pool[0];
    return setTerms.find((t) => t.id === id) || null;
  }, [started, pool, setTerms]);

  const currentStage = currentTerm ? (stageById[currentTerm.id] || 0) : 0;

  const mcqOptions = useMemo(() => {
    if (!currentTerm) return [];
    // Build 2 distractors from same set
    const others = setTerms.filter((t) => t.id !== currentTerm.id);
    const distractors = shuffle(others).slice(0, 2);
    return shuffle([currentTerm, ...distractors]).map((t) => ({
      id: t.id,
      label: t.name,
    }));
  }, [currentTerm, setTerms]);
  useEffect(() => {
    // Whenever the current card or stage changes, unlock and clear UI state
    setLocked(false);
    setShowContinue(false);
    setMcqChoice(null);
    setTyped("");

    // Focus typing input automatically when we're in a typing stage
    if (currentTerm && (stageById[currentTerm.id] || 0) > 0) {
      // give the DOM a beat
      setTimeout(() => {
        inputRef.current?.focus?.();
      }, 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTerm?.id, stageById[currentTerm?.id]]);

  function resetRun() {
    setStarted(false);
    setPool([]);
    setCurrentIdx(0);
    setStageById({});
    setMcqChoice(null);
    setTyped("");
    setFeedback(null);
  }

  function startRun() {
    // initialize stages for all terms at 0
    const init = {};
    setTerms.forEach((t) => (init[t.id] = 0));

    setStageById(init);
    setPool(shuffle(setTerms.map((t) => t.id)));
    setCurrentIdx(0);
    setStarted(true);
    setMcqChoice(null);
    setTyped("");
    setFeedback({
      type: "ok",
      msg:
        "Round 1: Multiple choice. If you get it right, next time you’ll type it.",
    });
  }

  function goNextCard() {
    // reset UI controls
    setFeedback(null);
    setMcqChoice(null);
    setTyped("");
    setLocked(false);
    setShowContinue(false);
    setMustCopy(false);
    setMissedThisCard(false);

    if (pool.length === 0) return;

    const currentId = pool[0];
    const currentStage = stageById[currentId] || 0;
    const isMastered = currentStage >= 3;

    setPool((prev) => {
      if (prev.length === 0) return prev;

      const id = prev[0];
      let rest = prev.slice(1);

      // if current is mastered, drop it from the queue
      if (isMastered) {
        return rest;
      }

      // if last result was wrong, reinsert soon (2–3 cards later)
      if (lastResult === "wrong") {
        return reinsertSoon(rest, id);
      }

      // otherwise (correct), push to end
      return [...rest, id];
    });

    setLastResult(null);
  }

  function markCorrect(termId) {
    setStageById((prev) => {
      const stage = prev[termId] || 0;
      return { ...prev, [termId]: nextStage(stage) };
    });
  }

  function markIncorrect() {
    // Quizlet-like “try again soon” — we simply give feedback and keep card in rotation.
    // (Later we can add spaced repetition weighting.)
  }

 function submitMCQ() {
    if (!currentTerm || locked) return;

    if (!mcqChoice) {
      setFeedback({ type: "bad", msg: "Pick an answer first." });
      return;
    }

    setLocked(true);

    const correct = mcqChoice === currentTerm.id;

    if (correct) {
      markCorrect(currentTerm.id);
      setLastResult("correct");
      setFeedback({
        type: "ok",
        msg: "Correct ✅ Next time this card appears, you’ll type it.",
      });
    } else {
      setFeedback({
        type: "bad",
        msg: `Not quite — correct answer: “${currentTerm.name}”. You’ll see it again soon.`,
      });
      markIncorrect();
      setLastResult("wrong");
    }

    setShowContinue(true);
  }

  function submitTyped() {
    if (!currentTerm || locked) return;

    const input = typed.trim();
    if (!input) {
      setFeedback({ type: "bad", msg: "Type an answer first." });
      return;
    }

    // Normalize correct check
    const typedCorrect = isCorrectTyped(currentTerm, typed);

    // CASE A: They already missed once → now they must COPY EXACT name to continue
    if (mustCopy) {
      const exact = normalizeAnswer(typed) === normalizeAnswer(currentTerm.name);

      if (exact) {
        // They are allowed to move on, but this does NOT count as correct/mastery
        setFeedback({ type: "ok", msg: "Thanks — you’ll see this card again soon." });
        setLocked(true);
        setShowContinue(true);
      } else {
        setFeedback({
          type: "bad",
          msg: `Copy the answer exactly to continue: “${currentTerm.name}”`,
        });
        setLocked(false);
        setShowContinue(false);
      }
      return;
    }

    // CASE B: First attempt this appearance
    if (typedCorrect) {
      // This counts as a real correct → advance stage
      setLocked(true);
      setLastResult("correct");
      markCorrect(currentTerm.id);
      setFeedback({ type: "ok", msg: "Correct ✅" });
      setShowContinue(true);
    } else {
      // This is a real miss → do NOT advance stage, force copy-to-continue
      markIncorrect(); // (optional analytics; doesn't change stage)
      setMissedThisCard(true);
      setMustCopy(true);
      setLastResult("wrong");
      setFeedback({
        type: "bad",
        msg: `Not quite — correct answer: “${currentTerm.name}”. You’ll see this again soon. Type it exactly to continue.`,
      });

      // unlock so they can type the copy
      setLocked(false);
      setShowContinue(false);

      // Clear input so they retype cleanly
      setTyped("");
    }
  }
  const showSetup = !started;

  return (
    <div className="container">
      <h1 className="pageTitle">Flashcard Game</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Learn-style mode: each term is mastered after <b>1 correct multiple choice</b> +
        <b> 2 correct typed recalls</b>.
      </p>

      {/* Setup panel */}
      {showSetup && (
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
            <>
              <p className="muted" style={{ marginTop: 10 }}>
                Pick a view/dissection set to study.
              </p>

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
            </>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn primary"
              type="button"
              onClick={startRun}
              disabled={setTerms.length === 0 || (course === COURSE.BEHAVIORAL_NEURO && !selectedScope)}
              title={setTerms.length === 0 ? "No terms found for this set yet." : ""}
            >
              Start game
            </button>
            <span className="muted">
              {course === COURSE.BEHAVIORAL_NEURO && selectedScope
                ? `Set: ${scopeLabelFromKey(selectedScope)} • ${setTerms.length} terms`
                : `${setTerms.length} terms`}
            </span>
          </div>
        </section>
      )}

      {/* Game panel */}
      {!showSetup && currentTerm && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="gameTopRow">
            <div>
              <div className="muted" style={{ fontSize: 13 }}>
                {course === COURSE.BEHAVIORAL_NEURO && selectedScope
                  ? scopeLabelFromKey(selectedScope)
                  : "Course term set"}
              </div>
              <h2 className="sectionTitle" style={{ marginTop: 4 }}>
                Progress: {masteredCount}/{totalCount} mastered
              </h2>
            </div>

            <button className="btn" type="button" onClick={resetRun}>
              Change set
            </button>
          </div>

          {/* Image */}
          {currentTerm.image ? (
            <div className="termImgWrap" style={{ marginTop: 12 }}>
              <img className="termImg" src={currentTerm.image} alt={`${currentTerm.name} reference`} />
            </div>
          ) : (
            <div className="noteCallout" style={{ marginTop: 12 }}>
              <b>Note:</b> This card has no image yet. Add <code>image:</code> in TERM_BANK to use image-based recall.
            </div>
          )}

          {/* Stage prompt */}
          <div className="gameStage" style={{ marginTop: 12 }}>
            <span className="pillStage">
              Stage {Math.min(currentStage + 1, 3)}/3 •{" "}
              {currentStage === 0 ? "Multiple Choice" : "Type the answer"}
            </span>
            <span className="muted" style={{ fontSize: 13 }}>
              Term mastered when you get it correct 3 times in the sequence.
            </span>
          </div>

          {/* Interaction */}
          {currentStage === 0 ? (
            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ marginBottom: 8 }}>
                Which structure is highlighted?
                <span style={{ marginLeft: 8 }} className="muted">(Next time you’ll spell it.)</span>
              </div>

              <div className="mcqGrid">
                {mcqOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`mcqBtn ${mcqChoice === opt.id ? "active" : ""}`}
                    onClick={() => setMcqChoice(opt.id)}
                    disabled={locked}
                    aria-pressed={mcqChoice === opt.id}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button className="btn primary" type="button" style={{ marginTop: 10 }} onClick={submitMCQ} disabled={locked}>
                Submit
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ marginBottom: 8 }}>
                Type the structure name:
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  ref={inputRef}
                  className="termSearch"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Start typing…"
                  disabled={locked}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !locked) submitTyped();
                  }}
                  aria-label="Type answer"
                  style={{ flex: "1 1 320px" }}
                />

                <button className="btn primary" type="button" onClick={submitTyped} disabled={locked}>
                  Check
                </button>
              </div>

              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                Tip: capitalization doesn’t matter. Aliases are accepted.
              </div>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className={`feedback ${feedback.type}`} style={{ marginTop: 12 }}>
              {feedback.msg}
            </div>
          )}
          {showContinue && (
            <button className="btn primary" type="button" style={{ marginTop: 10 }} onClick={goNextCard}>
              Continue
            </button>
          )}
        </section>
      )}

      {!showSetup && !currentTerm && (
        <section className="card" style={{ marginTop: 14 }}>
          <h2 className="sectionTitle">All mastered ✅</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            You mastered the entire set. You can reset and run it again for extra reinforcement.
          </p>
          <button className="btn primary" type="button" onClick={resetRun} style={{ marginTop: 10 }}>
            Pick a new set
          </button>
        </section>
      )}
    </div>

  );
}