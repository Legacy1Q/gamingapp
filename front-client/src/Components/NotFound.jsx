import { Link } from "react-router-dom";
import "../styles/NotFound.css";

export default function NotFound() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="not-found-code">404 · Page not found</p>
      <h1 id="not-found-title">This level doesn’t exist.</h1>
      <p>The page may have moved, or the link may be incorrect. Let’s get you back to the games.</p>
      <div className="not-found-actions">
        <Link to="/">Back home</Link>
        <Link to="/games">Browse games</Link>
      </div>
    </section>
  );
}
