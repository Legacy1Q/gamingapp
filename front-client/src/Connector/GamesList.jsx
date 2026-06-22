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
    <div>
      <h1>Game Library</h1>

      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

export default GamesList;