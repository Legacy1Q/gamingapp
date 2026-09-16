import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function GameSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5004";
    async function load() {
      try {
        const response = await fetch(new URL("/games", base), { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load games.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Unable to load games.");
        setGames(data);
      } catch {
        if (!controller.signal.aborted) setError("Search is unavailable. Browse the game library instead.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => { setOpen(false); setQuery(""); }, [location]);

  const term = normalize(query.trim());
  const matches = term ? games.filter(game => normalize(game.title || "").includes(term)) : [];
  const visible = open && query.trim().length > 0;

  return <form className="search-bar" role="search"
    onSubmit={event => { event.preventDefault(); setOpen(true); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
    <input type="search" placeholder="Search games..." aria-label="Search games"
      aria-controls={visible ? "game-search-results" : undefined}
      autoComplete="off" value={query}
      onChange={event => { setQuery(event.target.value); setOpen(true); }}
      onFocus={() => setOpen(true)} />
    <button type="submit" className="search-button" aria-label="Search">
      <FontAwesomeIcon icon={faSearch} />
    </button>
    {visible && <div className="game-search-results" id="game-search-results">
      <p role="status">{loading ? "Loading games…" : error || (matches.length ? `${matches.length} ${matches.length === 1 ? "game" : "games"} found` : "No games found. Try another title.")}</p>
      {!loading && !error && <ul>{matches.map(game => <li key={game.id}>
        <Link to={normalize(game.title) === "zdasher" ? "/games/z-dasher" : "/games"}
          onClick={() => { setOpen(false); setQuery(""); }}>
          {game.title}<span>View game →</span>
        </Link>
      </li>)}</ul>}
      {error && <Link to="/games">Browse games →</Link>}
    </div>}
  </form>;
}
