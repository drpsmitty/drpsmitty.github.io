import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="nav">
      <div className="navInner">
        <NavLink to="/" className="brand" aria-label="Neuromocs Home">
          <img
            className="brandMark"
            src="/brand/mocs-brain-badge.png"
            alt=""
            aria-hidden="true"
          />
          <span className="brandName">Neuromocs</span>
        </NavLink>

        <nav className="links" aria-label="Primary navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/brain-terms">
            Brain + Terms
          </NavLink>
          <NavLink to="/ltm">
            Long-Term Memory
          </NavLink>
          <NavLink to="/videos">
            Dissection Videos
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
