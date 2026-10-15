import { apiBaseUrl } from "../config.js";
import { useEffect, useState } from "react";
import GameCard from "../Components/GameCard";

function GamesList() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(new URL("/catalog", apiBaseUrl))
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load games.");
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Unable to load games.");
        setGames(data);
      })
      .catch(() => setError("Unable to load games. Please try again shortly."))
      .finally(() => setLoading(false));
  }, []);


  return (
    <div className="game-library">
      <header className="game-library-heading">
        <p>Made by Mike Sims</p>
        <h1>Game Library</h1>
        <span>Explore the games I’m creating.</span>
      </header>
      <div className="game-library-list">
      {loading && <p role="status">Loading games…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && games.length === 0 && <p>No games available yet.</p>}

      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
      </div>
    </div>
  );
}

export default GamesList;
