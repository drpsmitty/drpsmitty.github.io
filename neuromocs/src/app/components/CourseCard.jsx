export default function CourseCard({ title, description, goals, route }) {
  return (
    <div className="courseCard2">
      <div className="courseCard2Header">
        <span className="courseStripe" aria-hidden="true" />
        <div>
          <h3 className="courseTitle">{title}</h3>
          <p className="muted courseDesc">{description}</p>
        </div>
      </div>

      <ul className="courseGoals2">
        {goals.map((g, i) => <li key={i}>{g}</li>)}
      </ul>

      <a className="btn primary" href={route}>Open study materials</a>
    </div>
  );
}
