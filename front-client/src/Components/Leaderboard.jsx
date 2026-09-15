import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/Leaderboard.css";

function formatTime(ms) {
  return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}

export default function Leaderboard() {
  const { user, loading: sessionLoading } = useAuth();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError("");
    async function load() {
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5004";
      const response = await fetch(new URL(`/leaderboards/z-dasher?page=${page}`, base), { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Please log in again to view the leaderboard." : "Unable to load the leaderboard. Please try again.");
      const result = await response.json();
      if (active) setData(result);
    }
    load().catch(failure => { if (active) setError(failure instanceof TypeError ? "Unable to reach the server. Please try again." : failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, page, revision]);

  return <div className="leaderboard-page"><div className="leaderboard-content">
    <Link to="/games/z-dasher">← Z-Dasher</Link>
    <p className="leaderboard-eyebrow">Z-Dasher · Fastest finish</p><h1>Leaderboard</h1>
    <p>Complete all five deliveries without dying. Your fastest successful run counts.</p>
    <p className="leaderboard-note">Times include server communication and time spent paused or away from the game. Equal times share a rank.</p>
    {sessionLoading ? <p role="status">Checking session…</p> : !user ? <p><Link to="/login" state={{ returnTo: "/leaderboard" }}>Log in</Link> to see player rankings.</p> : <>
      <button disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh times</button>
      {loading ? <p role="status">Loading times…</p> : error ? <p role="alert" className="leaderboard-error">{error}</p> : data && <>
        <div className="leaderboard-best"><h2>Your personal best</h2><p>{data.personalBest ? `${formatTime(data.personalBest.elapsedMilliseconds)} · Rank ${data.personalBest.rank}` : "No qualifying run yet. Finish all deliveries alive to set your first time."}</p></div>
        {data.items.length === 0 ? <p>No qualifying finishes yet. The first place is waiting.</p> : <div className="leaderboard-table-wrap"><table>
          <caption>Fastest successful runs · {data.total} players</caption><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Best time</th><th scope="col">Completed</th></tr></thead>
          <tbody>{data.items.map((row, index) => <tr key={`${page}-${index}`} className={row.isYou ? "leaderboard-you" : undefined}>
            <td>{row.rank}</td><th scope="row">{row.name}{row.isYou ? " (you)" : ""}</th><td>{formatTime(row.elapsedMilliseconds)}</td><td>{new Date(row.completedAt).toLocaleDateString()}</td>
          </tr>)}</tbody>
        </table></div>}
        {data.total > 20 && <nav className="leaderboard-pages" aria-label="Leaderboard pages"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 20 >= data.total} onClick={() => setPage(value => value + 1)}>Next</button></nav>}
      </>}
    </>}
  </div></div>;
}
