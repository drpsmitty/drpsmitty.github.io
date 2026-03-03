import { useMemo, useState } from "react";
import { TERM_BANK } from "../data/terms";
import { BN_SCOPES } from "../data/brainScopes";

const COURSE = {
  BEHAVIORAL_NEURO: "behavioral_neuro",
  PSYCH_NATURAL_WORLD: "psych_natural_world",
};

function getHighlightColor(highlight) {
  switch (highlight) {
    case "green": return "var(--tag-green)";
    case "red": return "var(--tag-red)";
    case "yellow": return "var(--tag-yellow)";
    default: return "var(--border)";
  }
}


/** Behavioral Neuro decision tree */
function BehavioralNeuroPicker({ onSelectScope }) {
  const [top, setTop] = useState(null); // "sections" | "dissections"
  const [sectionKind, setSectionKind] = useState(null); // "whole"|"sagittal"|"coronal"|"horizontal"
  const [wholeView, setWholeView] = useState(null); // "lateral"|"ventral"|"dorsal"
  const [horizontalLevel, setHorizontalLevel] = useState(null); // "upper"|"lower"
  const [dissection, setDissection] = useState(null); // "cerebellum"|"fornix_lateral"|"fornix_dorsal"

  const resetAll = () => {
    setTop(null);
    setSectionKind(null);
    setWholeView(null);
    setHorizontalLevel(null);
    setDissection(null);
  };

  const pickScope = (key) => onSelectScope(key);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="bnHeaderRow">
        <h2 className="sectionTitle">Choose what you’re studying</h2>
        <button className="btn" type="button" onClick={resetAll}>Reset</button>
      </div>

      {/* Step 1 */}
      <div className="bnStep">
        <div className="bnStepLabel">Step 1</div>
        <div className="bnChoices">
          <button
            type="button"
            className={`choiceBtn ${top === "sections" ? "active" : ""}`}
            onClick={() => { setTop("sections"); setDissection(null); }}
          >
            Sections / Views
          </button>
          <button
            type="button"
            className={`choiceBtn ${top === "dissections" ? "active" : ""}`}
            onClick={() => { setTop("dissections"); setSectionKind(null); setWholeView(null); setHorizontalLevel(null); }}
          >
            Dissections
          </button>
        </div>
      </div>

      {/* Sections flow */}
      {top === "sections" && (
        <>
          <div className="bnStep">
            <div className="bnStepLabel">Step 2</div>
            <div className="bnChoices">
              <button
                type="button"
                className={`choiceBtn ${sectionKind === "whole" ? "active" : ""}`}
                onClick={() => { setSectionKind("whole"); setWholeView(null); }}
              >
                Whole
              </button>
              <button
                type="button"
                className={`choiceBtn ${sectionKind === "sagittal" ? "active" : ""}`}
                onClick={() => { setSectionKind("sagittal"); pickScope("bn:section:sagittal"); }}
              >
                Sagittal
              </button>
              <button
                type="button"
                className={`choiceBtn ${sectionKind === "coronal" ? "active" : ""}`}
                onClick={() => { setSectionKind("coronal"); pickScope("bn:section:coronal"); }}
              >
                Coronal
              </button>
              <button
                type="button"
                className={`choiceBtn ${sectionKind === "horizontal" ? "active" : ""}`}
                onClick={() => { setSectionKind("horizontal"); setHorizontalLevel(null); }}
              >
                Horizontal
              </button>
            </div>
          </div>

          {sectionKind === "whole" && (
            <div className="bnStep">
              <div className="bnStepLabel">Step 3</div>
              <div className="bnChoices">
                <button
                  type="button"
                  className={`choiceBtn ${wholeView === "lateral" ? "active" : ""}`}
                  onClick={() => { setWholeView("lateral"); pickScope("bn:whole:lateral"); }}
                >
                  Lateral
                </button>
                <button
                  type="button"
                  className={`choiceBtn ${wholeView === "ventral" ? "active" : ""}`}
                  onClick={() => { setWholeView("ventral"); pickScope("bn:whole:ventral"); }}
                >
                  Ventral
                </button>
                <button
                  type="button"
                  className={`choiceBtn ${wholeView === "dorsal" ? "active" : ""}`}
                  onClick={() => { setWholeView("dorsal"); pickScope("bn:whole:dorsal"); }}
                >
                  Dorsal
                </button>
              </div>
            </div>
          )}

          {sectionKind === "horizontal" && (
            <div className="bnStep">
              <div className="bnStepLabel">Step 3</div>
              <div className="bnChoices">
                <button
                  type="button"
                  className={`choiceBtn ${horizontalLevel === "upper" ? "active" : ""}`}
                  onClick={() => { setHorizontalLevel("upper"); pickScope("bn:section:horizontal:upper"); }}
                >
                  Upper
                </button>
                <button
                  type="button"
                  className={`choiceBtn ${horizontalLevel === "lower" ? "active" : ""}`}
                  onClick={() => { setHorizontalLevel("lower"); pickScope("bn:section:horizontal:lower"); }}
                >
                  Lower
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dissections flow */}
      {top === "dissections" && (
        <div className="bnStep">
          <div className="bnStepLabel">Step 2</div>
          <div className="bnChoices">
            <button
              type="button"
              className={`choiceBtn ${dissection === "cerebellum" ? "active" : ""}`}
              onClick={() => { setDissection("cerebellum"); pickScope("bn:dissection:cerebellum"); }}
            >
              Cerebellum
            </button>
            <button
              type="button"
              className={`choiceBtn ${dissection === "fornix_lateral" ? "active" : ""}`}
              onClick={() => { setDissection("fornix_lateral"); pickScope("bn:dissection:fornix:lateral"); }}
            >
              Fornix — lateral
            </button>
            <button
              type="button"
              className={`choiceBtn ${dissection === "fornix_dorsal" ? "active" : ""}`}
              onClick={() => { setDissection("fornix_dorsal"); pickScope("bn:dissection:fornix:dorsal"); }}
            >
              Fornix — dorsal
            </button>
          </div>
        </div>
      )}

      <div className="bnHint muted" style={{ marginTop: 10 }}>
        Once you make a final selection, your term list + images will appear below.
      </div>
    </div>
  );
}

export default function BrainTerms() {
  const [course, setCourse] = useState(COURSE.BEHAVIORAL_NEURO);

  // For Behavioral Neuro: selected scope is REQUIRED to show list
  const [selectedScope, setSelectedScope] = useState(null);

  // “Search within the current selection”
  const [query, setQuery] = useState("");
  const [showOnlyTaggable, setShowOnlyTaggable] = useState(false);

  // Reset scope + search when switching courses
  const onChangeCourse = (c) => {
    setCourse(c);
    setSelectedScope(null);
    setQuery("");
    setShowOnlyTaggable(false);
  };

  const scopeLabel = useMemo(() => {
    if (!selectedScope) return "";
    return BN_SCOPES.find((s) => s.key === selectedScope)?.label || selectedScope;
  }, [selectedScope]);

  const terms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TERM_BANK
        .filter((t) => t.courses.includes(course))
        .filter((t) =>
            course === COURSE.BEHAVIORAL_NEURO
            ? (t.scopeKeys || []).includes(selectedScope)
            : true
        )
        .filter((t) => (showOnlyTaggable ? !!t.taggable : true))
        .filter((t) => {
            if (!q) return true;

            const name = (t.name || "").toLowerCase();
            const def = (t.definition || "").toLowerCase();
            const aliases = (t.aliases || []).map((a) => (a || "").toLowerCase());

            return (
            name.includes(q) ||
            def.includes(q) ||
            aliases.some((a) => a.includes(q))
            );
        })
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [course, selectedScope, query, showOnlyTaggable]);

  const canShowResults =
    course === COURSE.PSYCH_NATURAL_WORLD || (course === COURSE.BEHAVIORAL_NEURO && !!selectedScope);

  return (
    <div className="container">
      <header className="pageHeader">
        <div className="pageTitleRow">
          <h1 className="pageTitle">Brain + Terms</h1>
          <p className="pageSubtitle muted">
            Choose your course, then use the legend to interpret highlights. (Taggable on exams: <b>Red</b> &amp; <b>Yellow</b>.)
          </p>
        </div>

        {/* Course toggle */}
        <div className="courseToggle">
          <button
            className={`toggleBtn ${course === COURSE.BEHAVIORAL_NEURO ? "active" : ""}`}
            onClick={() => onChangeCourse(COURSE.BEHAVIORAL_NEURO)}
            type="button"
          >
            Behavioral Neuroscience
          </button>
          <button
            className={`toggleBtn ${course === COURSE.PSYCH_NATURAL_WORLD ? "active" : ""}`}
            onClick={() => onChangeCourse(COURSE.PSYCH_NATURAL_WORLD)}
            type="button"
          >
            Psychology in the Natural World
          </button>
        </div>

        {/* Instructions + Legend */}
        <section className="card" style={{ marginTop: 14 }}>
          <h2 className="sectionTitle">How to use this page</h2>

          <ol className="howList" style={{ marginTop: 10, paddingLeft: 18 }}>
            <li><b>Choose your course</b> (filters to only what you’re responsible for).</li>
            <li><b>Use the images</b> as your map (structure → function → behavior).</li>
            <li><b>Use the term cards</b> to learn definitions, aliases, and what’s testable.</li>
          </ol>

          <div className="legendRow" style={{ marginTop: 14 }}>
            <div className="legendItem">
              <span className="legendSwatch" style={{ background: "var(--tag-green)" }} />
              <div>
                <div className="legendTitle">Green</div>
                <div className="muted">Cortex / general term (recognize; not taggable)</div>
              </div>
            </div>

            <div className="legendItem">
              <span className="legendSwatch" style={{ background: "var(--tag-red)" }} />
              <div>
                <div className="legendTitle">Red</div>
                <div className="muted">Gyri (taggable)</div>
              </div>
            </div>

            <div className="legendItem">
              <span className="legendSwatch" style={{ background: "var(--tag-yellow)" }} />
              <div>
                <div className="legendTitle">Yellow</div>
                <div className="muted">Sulci / fissures (taggable)</div>
              </div>
            </div>
          </div>

          <div className="noteCallout" style={{ marginTop: 14 }}>
            <b>Tagging note for Behavioral Neuroscience:</b> You should recognize all labeled structures, but only <b>Red (Gyri)</b> and <b>Yellow (Sulci/Fissures)</b> are taggable. All structures that have been covered 
            in the lab manual so far can be tagged on a test. This webpage covers the majority of the structures 
            that can be tagged on this view, however, please note that there may be other structures not listed here 
            that can be tagged.
            <b> Tagging note for Pyschology in The Natural World:</b> All of the structures you are given, you need to have memorized for your exam. Do not click the "only taggable" box.
          </div>
        </section>

        {/* Behavioral Neuro picker replaces the search bar */}
        {course === COURSE.BEHAVIORAL_NEURO ? (
          <BehavioralNeuroPicker onSelectScope={(key) => { setSelectedScope(key); setQuery(""); }} />
        ) : null}
      </header>

      {/* Results controls (search/toggle) appear once a final selection exists */}
      {canShowResults && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="panelHeader">
            <h2 className="sectionTitle">
              {course === COURSE.BEHAVIORAL_NEURO ? `Results: ${scopeLabel}` : "Term bank"}
            </h2>

            <div className="termControls">
              <input
                className="termSearch"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  course === COURSE.BEHAVIORAL_NEURO
                    ? "Search within this selection (e.g., ‘cingulate’, ‘central sulcus’)"
                    : "Search terms (e.g., ‘cingulate’, ‘central sulcus’)"
                }
                aria-label="Search terms"
              />
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={showOnlyTaggable}
                  onChange={(e) => setShowOnlyTaggable(e.target.checked)}
                />
                <span>Only taggable (Red/Yellow)</span>
              </label>
            </div>

            <div className="termCount muted">{terms.length} terms</div>
          </div>

          {/* term list w/ optional image */}
          <div className="termGrid">
            {terms.map((t) => {
              const taggable = !!t.taggable;

              return (
                <article key={t.id} className={`termCard ${taggable ? "" : "notTaggable"}`}>
                  <div className="termTop">
                    <div className="termNameRow">
                      <h3 className="termName">{t.name}</h3>
                      <span className="typePill"
                        style={{
                            borderColor: getHighlightColor(t.highlight),
                            background: "var(--surface2)",
                        }}
                        title={t.categoryLabel || "Structure"}
                        >
                        <span
                            className="typeDot"
                            style={{ background: getHighlightColor(t.highlight) }}
                            aria-hidden="true"
                        />
                        {t.categoryLabel || "Structure"}
                    </span>

                    </div>

                    <div className={`tagPill ${taggable ? "taggable" : "recognize"}`}>
                      {taggable ? "Taggable" : "Recognize"}
                    </div>
                  </div>

                  {t.image ? (
                    <div className="termImgWrap">
                      <img className="termImg" src={t.image} alt="" aria-hidden="true" loading="lazy" />
                    </div>
                  ) : null}

                  <p className="termDef muted">{t.definition || <i>Add definition later.</i>}</p>

                  {t.aliases?.length ? (
                    <div className="termAliases">
                      <span className="muted" style={{ fontSize: 12 }}>Also:</span>
                      <div className="aliasChips">
                        {t.aliases.map((a) => (
                          <span key={a} className="aliasChip">{a}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state for BN before selection */}
      {course === COURSE.BEHAVIORAL_NEURO && !selectedScope && (
        <section className="card" style={{ marginTop: 14, background: "var(--surface2)" }}>
          <p className="muted">
            Select a <b>Section/View</b> or <b>Dissection</b> above to load the matching images and term list.
          </p>
        </section>
      )}
    </div>
  );
}
