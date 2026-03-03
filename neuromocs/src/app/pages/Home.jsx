import CourseCard from "../components/CourseCard";
import { courses } from "../data/courses";

export default function Home() {
  return (
    <div className="home homeHasWatermark">
      {/* HERO (quiet study room) */}
      <section className="heroStudy">
        <div className="heroStudyInner">
          <div className="heroLeft">
            <div className="heroKicker">Neuromocs • Study Companion</div>

            <h1 className="heroTitleLight">Neuromocs</h1>

            <p className="heroSubtitleLight">
              A calm, course-aligned space to learn brain structures, master terminology,
              and build long-term memory through retrieval practice.
            </p>

            <div className="heroCtas">
              <a className="btn primary" href="#/brain-terms">
                Start with Brain + Terms
              </a>
              <a className="btn" href="#/ltm">
                Train Long-Term Memory
              </a>
            </div>

            <p className="heroNotes muted">
              Tip: Use Terms → Flashcards → Labeling. If it feels hard, that’s your memory strengthening.
            </p>
          </div>

          <div className="heroRight">
            <div className="heroPanel">
              <div className="heroPanelTitle">What you’ll do here</div>
              <ul className="heroBullets">
                <li>Study the tested brain regions & definitions</li>
                <li>Practice recall with flashcards + review mode</li>
                <li>Label the brain with hover/drag highlighting</li>
              </ul>
              <div className="heroMiniLine" />
              <div className="heroSmall muted">
                Designed to feel like a quiet study room — structured, friendly, and focused.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Optional: lightweight "Get Started" row */}
      <section className="card" style={{ marginTop: 14, background: "var(--surface2)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <strong>Get started:</strong>
          <a className="btn" href="#/brain-terms">Brain + Terms</a>
          <a className="btn" href="#/ltm/flashcards">Flashcards</a>
          <a className="btn" href="#/ltm/label">Label the Brain</a>
          <a className="btn" href="#/videos">Watch Dissection videos</a>
        </div>
      </section>

      {/* COURSES */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2>Courses</h2>
        <p className="muted">
          Choose a course, then follow a consistent routine: Terms → Flashcards → Labeling.
        </p>

        <div className="courseGrid">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              description={course.description}
              goals={course.goals}
              route="#/brain-terms"
            />
          ))}
        </div>
      </section>

      {/* HOW TO USE */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2>How to use Neuromocs</h2>
        <ol className="howList">
          <li><b>Learn the map</b> in Brain + Terms (structure → function).</li>
          <li><b>Practice retrieval</b> with Flashcards (don’t just reread).</li>
          <li><b>Prove it</b> by labeling the brain until it’s automatic.</li>
        </ol>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface2)"
          }}
        >
          <b>Motivation:</b> If it feels hard, it’s working. Retrieval strengthens memory.
        </div>
      </section>
    </div>
  );
}



