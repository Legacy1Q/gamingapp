import { useEffect, useState } from "react";
import CreateGameForm from "../Components/CreateGameForm";

function GamesList() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5004/games")
      .then(response => response.json())
      .then(data => setGames(data))
      .catch(error => console.error("Error fetching games:", error));
  }, []);

  return (
    <div>
      <h1>Games</h1>

      <CreateGameForm onGameCreated={handleGameCreated} />

      {games.map(game => (
        <div key={game.id}>
          <h2>{game.title}</h2>
          <p>{game.genre}</p>
          <p>{game.description}</p>
          <p>Developer: {game.developerName}</p>
        </div>
      ))}
    </div>
  );
}

function handleGameCreated(newGame) {
    setGames(prevGames => [...prevGames, newGame]);
}

export default GamesList;