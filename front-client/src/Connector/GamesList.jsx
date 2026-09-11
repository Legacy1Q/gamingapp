import { useEffect, useState } from "react";
import GameCard from "../Components/GameCard";

function GamesList() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5004/games")
      .then((response) => response.json())
      .then((data) => setGames(data))
      .catch((error) => console.error("Error fetching games:", error));
  }, []);


  return (
    <div className="game-library">
      <header className="game-library-heading">
        <p>Made by Mike Sims</p>
        <h1>Game Library</h1>
        <span>Explore the games I’m creating.</span>
      </header>
      <div className="game-library-list">

      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
      </div>
    </div>
  );
}

export default GamesList;
